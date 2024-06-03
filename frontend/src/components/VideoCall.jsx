// client/src/components/VideoCall.js
import React, { useEffect, useRef, useState } from 'react';
import socket from '../socket';

const VideoCall = ({ roomID }) => {
    const [otherUser, setOtherUser] = useState(null);
    const [stream, setStream] = useState(null);
    const userVideo = useRef();
    const partnerVideo = useRef();
    const peerRef = useRef();
    const socketRef = useRef();
    const otherUserRef = useRef();
    const userStreamRef = useRef();

    useEffect(() => {
        socketRef.current = socket;
        navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
            setStream(stream);
            userVideo.current.srcObject = stream;
            userStreamRef.current = stream;
            socketRef.current.emit('join room', roomID);

            socketRef.current.on('other user', userID => {
                setOtherUser(userID);
                otherUserRef.current = userID;
                callUser(userID);
            });

            socketRef.current.on('user joined', userID => {
                setOtherUser(userID);
                otherUserRef.current = userID;
            });

            socketRef.current.on('offer', handleReceiveCall);

            socketRef.current.on('answer', handleAnswer);

            socketRef.current.on('ice-candidate', handleNewICECandidateMsg);
        });
    }, []);

    function callUser(userID) {
        peerRef.current = createPeer(userID);
        userStreamRef.current.getTracks().forEach(track => peerRef.current.addTrack(track, userStreamRef.current));
    }

    function createPeer(userID) {
        const peer = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
            ],
        });

        peer.onicecandidate = handleICECandidateEvent;
        peer.ontrack = handleTrackEvent;
        peer.onnegotiationneeded = () => handleNegotiationNeededEvent(userID);

        return peer;
    }

    function handleNegotiationNeededEvent(userID) {
        peerRef.current.createOffer().then(offer => {
            return peerRef.current.setLocalDescription(offer);
        }).then(() => {
            const payload = {
                target: userID,
                caller: socketRef.current.id,
                sdp: peerRef.current.localDescription,
            };
            socketRef.current.emit('offer', payload);
        }).catch(e => console.log(e));
    }

    function handleReceiveCall(incoming) {
        peerRef.current = createPeer();
        const desc = new RTCSessionDescription(incoming.sdp);
        peerRef.current.setRemoteDescription(desc).then(() => {
            userStreamRef.current.getTracks().forEach(track => peerRef.current.addTrack(track, userStreamRef.current));
        }).then(() => {
            return peerRef.current.createAnswer();
        }).then(answer => {
            return peerRef.current.setLocalDescription(answer);
        }).then(() => {
            const payload = {
                target: incoming.caller,
                caller: socketRef.current.id,
                sdp: peerRef.current.localDescription,
            };
            socketRef.current.emit('answer', payload);
        });
    }

    function handleAnswer(message) {
        const desc = new RTCSessionDescription(message.sdp);
        peerRef.current.setRemoteDescription(desc).catch(e => console.log(e));
    }

    function handleICECandidateEvent(e) {
        if (e.candidate) {
            const payload = {
                target: otherUserRef.current,
                candidate: e.candidate,
            };
            socketRef.current.emit('ice-candidate', payload);
        }
    }

    function handleNewICECandidateMsg(incoming) {
        const candidate = new RTCIceCandidate(incoming);
        peerRef.current.addIceCandidate(candidate).catch(e => console.log(e));
    }

    function handleTrackEvent(e) {
        partnerVideo.current.srcObject = e.streams[0];
    }

    return (
        <div>
            <video autoPlay ref={userVideo} />
            <video autoPlay ref={partnerVideo} />
        </div>
    );
};

export default VideoCall;
