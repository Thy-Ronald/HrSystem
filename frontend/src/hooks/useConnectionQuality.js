import { useState, useEffect, useRef } from 'react';

/**
 * Hook to monitor WebRTC connection quality
 * Returns connection status, latency, and quality metrics
 */
export function useConnectionQuality(peerConnection, isConnected) {
  const [connectionState, setConnectionState] = useState('disconnected');
  const [quality, setQuality] = useState('unknown');
  const [latency, setLatency] = useState(null);
  const statsIntervalRef = useRef(null);

  useEffect(() => {
    if (!peerConnection || !isConnected) {
      setConnectionState('disconnected');
      setQuality('unknown');
      setLatency(null);
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }
      return;
    }

    // Monitor connection state
    const updateConnectionState = () => {
      const state = peerConnection.connectionState || peerConnection.iceConnectionState;
      setConnectionState(state);

      // Map connection state to quality
      if (state === 'connected' || state === 'completed') {
        setConnectionState('connected');
      } else if (state === 'connecting' || state === 'checking') {
        setConnectionState('connecting');
      } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        setConnectionState('disconnected');
      }
    };

    // Get connection statistics
    const updateStats = async () => {
      try {
        const stats = await peerConnection.getStats();
        let totalRTT = 0;
        let rttCount = 0;
        let bytesReceived = 0;
        let bytesSent = 0;
        let packetsLost = 0;
        let packetsReceived = 0;

        stats.forEach((report) => {
          // Calculate RTT from candidate pairs
          if (report.type === 'candidate-pair' && report.currentRoundTripTime) {
            totalRTT += report.currentRoundTripTime * 1000; // Convert to ms
            rttCount++;
          }

          // Get bytes received/sent
          if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
            bytesReceived += report.bytesReceived || 0;
            packetsReceived += report.packetsReceived || 0;
            packetsLost += report.packetsLost || 0;
          }

          if (report.type === 'outbound-rtp' && report.mediaType === 'video') {
            bytesSent += report.bytesSent || 0;
          }
        });

        // Calculate average latency
        if (rttCount > 0) {
          const avgLatency = Math.round(totalRTT / rttCount);
          setLatency(avgLatency);
        }

        // Determine quality based on packet loss and latency
        const packetLossRate = packetsReceived > 0 ? (packetsLost / packetsReceived) * 100 : 0;
        const avgLatency = rttCount > 0 ? totalRTT / rttCount : null;

        if (avgLatency !== null) {
          if (avgLatency < 100 && packetLossRate < 1) {
            setQuality('excellent');
          } else if (avgLatency < 200 && packetLossRate < 3) {
            setQuality('good');
          } else if (avgLatency < 400 && packetLossRate < 5) {
            setQuality('fair');
          } else {
            setQuality('poor');
          }
        }
      } catch (err) {
        console.error('Error getting connection stats:', err);
      }
    };

    // Initial state update
    updateConnectionState();

    // Listen for connection state changes
    peerConnection.addEventListener('connectionstatechange', updateConnectionState);
    peerConnection.addEventListener('iceconnectionstatechange', updateConnectionState);

    // Update stats every 5 seconds
    statsIntervalRef.current = setInterval(updateStats, 5000);
    updateStats(); // Initial stats

    return () => {
      peerConnection.removeEventListener('connectionstatechange', updateConnectionState);
      peerConnection.removeEventListener('iceconnectionstatechange', updateConnectionState);
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }
    };
  }, [peerConnection, isConnected]);

  return {
    connectionState,
    quality,
    latency,
    isConnected: connectionState === 'connected' || connectionState === 'completed',
    isConnecting: connectionState === 'connecting' || connectionState === 'checking',
  };
}
