/**
 * useScreenShare Hook
 * Manages WebRTC screen sharing with Socket.IO signaling
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useSocket } from './useSocket';

const STUN_SERVERS = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

export function useScreenShare(role, sessionId) {
  const { socket, isConnected, emit, subscribe, unsubscribe } = useSocket();
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef(new Map()); // Map<adminSocketId, RTCPeerConnection>
  const remoteVideoRef = useRef(null);
  const cleanupHandlersRef = useRef([]);
  const iceCandidateQueuesRef = useRef(new Map()); // Map<adminSocketId, Array<candidate>>

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Stop sharing if active
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }

      // Clean up all event handlers
      cleanupHandlersRef.current.forEach((cleanup) => cleanup());
      cleanupHandlersRef.current = [];

      // Close all peer connections
      peerConnectionsRef.current.forEach((pc) => {
        pc.close();
      });
      peerConnectionsRef.current.clear();
      iceCandidateQueuesRef.current.clear();

      // Clear remote stream
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
    };
  }, []);

  /**
   * Start screen sharing (Employee only)
   */
  const startSharing = useCallback(async () => {
    if (role !== 'employee') {
      setError('Only employees can start sharing');
      return;
    }

    // Check if we have a sessionId (means we're authenticated)
    if (!sessionId) {
      setError('Not authenticated. Please wait for session to be created.');
      console.error('[WebRTC] Cannot start sharing: no sessionId. User needs to authenticate first.');
      return;
    }

    try {
      setError(null);

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          width: { max: 1280 },
          height: { max: 720 },
          frameRate: { max: 15 } // Reduce FPS to save CPU/Bandwidth
        },
        audio: false,
      });

      // Optimize for text/static content (typical work environment)
      const track = stream.getVideoTracks()[0];
      if (track && 'contentHint' in track) {
        track.contentHint = 'text';
      }

      localStreamRef.current = stream;
      setIsSharing(true);

      // Notify server that sharing started
      console.log('[WebRTC] Employee screen share started, notifying server. SessionId:', sessionId);
      emit('monitoring:start-sharing');
      console.log('[WebRTC] monitoring:start-sharing event emitted');

      // Handle stream end (user stops sharing via browser UI)
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        stopSharing();
      });
    } catch (err) {
      console.error('Error starting screen share:', err);
      setError(err.message || 'Failed to start screen sharing');
      setIsSharing(false);
    }
  }, [role, emit, sessionId]);

  /**
   * Stop screen sharing (Employee only)
   */
  const stopSharing = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    setIsSharing(false);
    setError(null);

    if (role === 'employee') {
      emit('monitoring:stop-sharing');
    }

    // Close all peer connections
    peerConnectionsRef.current.forEach((pc) => {
      pc.close();
    });
    peerConnectionsRef.current.clear();
    iceCandidateQueuesRef.current.clear();

    setRemoteStream(null);
  }, [role, emit]);

  /**
   * Initialize WebRTC peer connection (Employee)
   */
  const initializePeerConnection = useCallback(() => {
    if (role !== 'employee' || !localStreamRef.current) {
      return;
    }

    const handleOffer = async ({ offer, fromSocketId }) => {
      try {
        console.log(`[WebRTC] Received offer from admin: ${fromSocketId}`);

        // Clean up existing connection for this admin if it exists
        if (peerConnectionsRef.current.has(fromSocketId)) {
          peerConnectionsRef.current.get(fromSocketId).close();
        }

        const pc = new RTCPeerConnection(STUN_SERVERS);
        peerConnectionsRef.current.set(fromSocketId, pc);

        // Add local stream tracks
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current);
        });

        // Handle ICE candidates from employee to this specific admin
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            emit('monitoring:ice-candidate', {
              sessionId,
              candidate: event.candidate,
              toSocketId: fromSocketId
            });
          }
        };

        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        emit('monitoring:answer', {
          sessionId,
          answer,
          toSocketId: fromSocketId,
        });

        // Process any queued ICE candidates for this admin
        if (iceCandidateQueuesRef.current.has(fromSocketId)) {
          console.log(`[WebRTC] Processing ${iceCandidateQueuesRef.current.get(fromSocketId).length} queued candidates for ${fromSocketId}`);
          iceCandidateQueuesRef.current.get(fromSocketId).forEach(cand => {
            pc.addIceCandidate(new RTCIceCandidate(cand)).catch(e => console.error('[WebRTC] Queued ICE Error:', e));
          });
          iceCandidateQueuesRef.current.delete(fromSocketId);
        }
      } catch (err) {
        console.error('Error handling offer:', err);
        setError('Failed to establish connection with viewer');
      }
    };

    const handleIceCandidate = ({ candidate, fromSocketId }) => {
      const pc = peerConnectionsRef.current.get(fromSocketId);
      if (pc && pc.remoteDescription) {
        pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.error('[WebRTC] ICE Error:', e));
      } else if (candidate) {
        // Queue for this admin
        if (!iceCandidateQueuesRef.current.has(fromSocketId)) {
          iceCandidateQueuesRef.current.set(fromSocketId, []);
        }
        iceCandidateQueuesRef.current.get(fromSocketId).push(candidate);
      }
    };

    subscribe('monitoring:offer', handleOffer);
    subscribe('monitoring:ice-candidate', handleIceCandidate);

    const cleanup = () => {
      unsubscribe('monitoring:offer', handleOffer);
      unsubscribe('monitoring:ice-candidate', handleIceCandidate);
    };
    cleanupHandlersRef.current.push(cleanup);

    return cleanup;
  }, [role, sessionId, emit, subscribe, unsubscribe]);

  /**
   * Start viewing (Admin only)
   */
  const startViewing = useCallback(async (targetSessionId) => {
    if (role !== 'admin') {
      setError('Only admins can view streams');
      return;
    }

    try {
      setError(null);

      // Clean up any existing connection first
      const existingPc = peerConnectionsRef.current.get('active');
      if (existingPc) {
        existingPc.close();
      }

      const pc = new RTCPeerConnection(STUN_SERVERS);
      peerConnectionsRef.current.set('active', pc);

      // Handle incoming stream
      pc.ontrack = (event) => {
        console.log('[WebRTC] Received track from employee, track kind:', event.track?.kind);
        console.log('[WebRTC] Track readyState:', event.track?.readyState);
        const stream = event.streams[0];
        if (stream) {
          console.log('[WebRTC] Stream received with', stream.getTracks().length, 'tracks');
          setRemoteStream(stream);
          // Try to attach immediately if video element exists
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = stream;
            console.log('[WebRTC] Stream attached to video element immediately');
          } else {
            console.log('[WebRTC] Video element not yet available, stream will be attached via useEffect');
          }
        } else {
          console.error('[WebRTC] No stream in ontrack event');
        }
      };

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log('[WebRTC] Connection state:', pc.connectionState);
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          setError('Connection failed. Please try again.');
        }
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          // Get employee socket ID from session (we'll need to track this)
          // For now, let server handle routing based on role
          emit('monitoring:ice-candidate', {
            sessionId: targetSessionId,
            candidate: event.candidate,
          });
        }
      };

      // Create and send offer
      const offer = await pc.createOffer({
        offerToReceiveVideo: true,
        offerToReceiveAudio: false,
      });
      await pc.setLocalDescription(offer);
      console.log('[WebRTC] Sending offer for session:', targetSessionId);

      emit('monitoring:offer', {
        sessionId: targetSessionId,
        offer,
      });

      // Handle answer from employee
      const handleAnswer = async ({ answer, sessionId: answerSessionId }) => {
        if (answerSessionId !== targetSessionId) return;

        try {
          console.log('[WebRTC] Received answer from employee');
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (err) {
          console.error('Error setting remote description:', err);
          setError('Failed to establish connection');
        }
      };

      subscribe('monitoring:answer', handleAnswer);

      // Handle ICE candidate from employee
      const handleIceCandidate = ({ candidate, sessionId: candidateSessionId }) => {
        if (candidateSessionId && candidateSessionId !== targetSessionId) return;
        if (candidate) {
          // Add candidate even if remoteDescription isn't set yet (it will be queued)
          if (pc.remoteDescription) {
            pc.addIceCandidate(new RTCIceCandidate(candidate)).catch((err) => {
              console.error('Error adding ICE candidate:', err);
            });
          } else {
            // Queue candidate for when remote description is set
            console.log('[WebRTC] Queuing ICE candidate (waiting for remote description)');
            pc.addEventListener('signalingstatechange', () => {
              if (pc.remoteDescription && pc.signalingState !== 'closed') {
                pc.addIceCandidate(new RTCIceCandidate(candidate)).catch((err) => {
                  console.error('Error adding queued ICE candidate:', err);
                });
              }
            }, { once: true });
          }
        }
      };

      subscribe('monitoring:ice-candidate', handleIceCandidate);

      // Store cleanup functions
      const cleanup = () => {
        unsubscribe('monitoring:answer', handleAnswer);
        unsubscribe('monitoring:ice-candidate', handleIceCandidate);
      };
      cleanupHandlersRef.current.push(cleanup);
    } catch (err) {
      console.error('Error starting viewing:', err);
      setError(err.message || 'Failed to start viewing');
    }
  }, [role, emit, subscribe, unsubscribe]);

  /**
   * Stop viewing (Admin only)
   */
  const stopViewing = useCallback(() => {
    // Clean up event handlers
    cleanupHandlersRef.current.forEach((cleanup) => cleanup());
    cleanupHandlersRef.current = [];

    const pc = peerConnectionsRef.current.get('active');
    if (pc) {
      pc.close();
      peerConnectionsRef.current.delete('active');
    }

    setRemoteStream(null);
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  }, []);

  // Initialize peer connection when sharing starts (employee)
  useEffect(() => {
    if (isSharing && role === 'employee' && localStreamRef.current) {
      const cleanup = initializePeerConnection();
      return cleanup;
    }
  }, [isSharing, role, initializePeerConnection]);

  // Track connection state for WebRTC
  const [webrtcConnected, setWebrtcConnected] = useState(false);

  useEffect(() => {
    let active = true;
    const pc = peerConnectionsRef.current.get('active');

    if (pc) {
      const updateConnectionState = () => {
        if (!active) return;
        const connected = pc.connectionState === 'connected' || pc.connectionState === 'connecting';
        setWebrtcConnected(connected);
      };

      pc.addEventListener('connectionstatechange', updateConnectionState);
      updateConnectionState();

      return () => {
        active = false;
        pc.removeEventListener('connectionstatechange', updateConnectionState);
      };
    } else {
      setWebrtcConnected(false);
    }
  }, [remoteStream, isConnected]); // remoteStream changes when startViewing/stopViewing is called

  return {
    isSharing,
    error,
    remoteStream,
    remoteVideoRef,
    startSharing,
    stopSharing,
    startViewing,
    stopViewing,
    isConnected: role === 'employee' ? isSharing : (webrtcConnected || !!remoteStream),
    peerConnections: peerConnectionsRef.current,
  };
}
