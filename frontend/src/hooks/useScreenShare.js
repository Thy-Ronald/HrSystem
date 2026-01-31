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

    // Check if we have a sessionId (means we're authenticated)
    if (!sessionId) {
      setError('Not authenticated. Please wait for session to be created.');
      console.error('[WebRTC] Cannot start sharing: no sessionId. User needs to authenticate first.');
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
    const handleIceCandidate = ({ candidate, sessionId: candidateSessionId }) => {
      // Only process if sessionId matches (or if not provided for backward compatibility)
      if (candidateSessionId && candidateSessionId !== sessionId) return;
      if (candidate) {
        if (pc.remoteDescription) {
          pc.addIceCandidate(new RTCIceCandidate(candidate)).catch((err) => {
            console.error('Error adding ICE candidate:', err);
          });
        } else {
          // Queue candidate for when remote description is set
          console.log('[WebRTC] Queuing ICE candidate (waiting for remote description)');
        }
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

      // Clean up any existing connection first
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }

      const pc = new RTCPeerConnection(STUN_SERVERS);
      peerConnectionRef.current = pc;

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

  // Track connection state for WebRTC
  const [webrtcConnected, setWebrtcConnected] = useState(false);

  useEffect(() => {
    if (peerConnectionRef.current) {
      const pc = peerConnectionRef.current;
      const updateConnectionState = () => {
        const connected = pc.connectionState === 'connected' || pc.connectionState === 'connecting';
        setWebrtcConnected(connected);
      };

      pc.addEventListener('connectionstatechange', updateConnectionState);
      updateConnectionState();

      return () => {
        pc.removeEventListener('connectionstatechange', updateConnectionState);
      };
    } else {
      setWebrtcConnected(false);
    }
  }, [remoteStream]); // Only depend on remoteStream, not the ref

  return {
    isSharing,
    error,
    remoteStream,
    remoteVideoRef,
    startSharing,
    stopSharing,
    startViewing,
    stopViewing,
    isConnected: webrtcConnected || !!remoteStream, // Connected if we have a stream or connection is active
    peerConnection: peerConnectionRef.current,
  };
}
