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
  const peerConnectionRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const cleanupHandlersRef = useRef([]);

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

      // Close peer connection
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }

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

    try {
      setError(null);

      // Request screen capture
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: false,
      });

      localStreamRef.current = stream;
      setIsSharing(true);

      // Notify server that sharing started
      emit('monitoring:start-sharing');

      // Handle stream end (user stops sharing via browser UI)
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        stopSharing();
      });
    } catch (err) {
      console.error('Error starting screen share:', err);
      setError(err.message || 'Failed to start screen sharing');
      setIsSharing(false);
    }
  }, [role, emit]);

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

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    setRemoteStream(null);
  }, [role, emit]);

  /**
   * Initialize WebRTC peer connection (Employee)
   */
  const initializePeerConnection = useCallback(() => {
    if (role !== 'employee' || !localStreamRef.current) {
      return;
    }

    const pc = new RTCPeerConnection(STUN_SERVERS);
    peerConnectionRef.current = pc;

    // Add local stream tracks
    localStreamRef.current.getTracks().forEach((track) => {
      pc.addTrack(track, localStreamRef.current);
    });

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        // Send ICE candidate - server will broadcast to all admins
        emit('monitoring:ice-candidate', {
          sessionId,
          candidate: event.candidate,
        });
      }
    };

    // Handle offer from admin
    const handleOffer = async ({ offer, fromSocketId }) => {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        emit('monitoring:answer', {
          sessionId,
          answer,
          toSocketId: fromSocketId,
        });
      } catch (err) {
        console.error('Error handling offer:', err);
        setError('Failed to establish connection');
      }
    };

    subscribe('monitoring:offer', handleOffer);

    // Handle ICE candidate from admin
    const handleIceCandidate = ({ candidate }) => {
      if (candidate) {
        pc.addIceCandidate(new RTCIceCandidate(candidate)).catch((err) => {
          console.error('Error adding ICE candidate:', err);
        });
      }
    };

    subscribe('monitoring:ice-candidate', handleIceCandidate);

    // Store cleanup functions
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

      const pc = new RTCPeerConnection(STUN_SERVERS);
      peerConnectionRef.current = pc;

      // Handle incoming stream
      pc.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
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
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      emit('monitoring:offer', {
        sessionId: targetSessionId,
        offer,
      });

      // Handle answer from employee
      const handleAnswer = ({ answer }) => {
        pc.setRemoteDescription(new RTCSessionDescription(answer)).catch((err) => {
          console.error('Error setting remote description:', err);
          setError('Failed to establish connection');
        });
      };

      subscribe('monitoring:answer', handleAnswer);

      // Handle ICE candidate from employee
      const handleIceCandidate = ({ candidate }) => {
        if (candidate) {
          pc.addIceCandidate(new RTCIceCandidate(candidate)).catch((err) => {
            console.error('Error adding ICE candidate:', err);
          });
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

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    setRemoteStream(null);
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    emit('monitoring:leave-session');
  }, [emit]);

  // Initialize peer connection when sharing starts (employee)
  useEffect(() => {
    if (isSharing && role === 'employee' && localStreamRef.current) {
      const cleanup = initializePeerConnection();
      return cleanup;
    }
  }, [isSharing, role, initializePeerConnection]);

  return {
    isSharing,
    error,
    remoteStream,
    remoteVideoRef,
    startSharing,
    stopSharing,
    startViewing,
    stopViewing,
    isConnected,
  };
}
