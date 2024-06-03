// client/src/pages/videoCall/VideoCallPage.js
import React from 'react';
import VideoCall from '../../components/VideoCall';

const VideoCallPage = () => {
    // You might want to get room ID from URL or generate dynamically
    const roomID = 'your-room-id'; 

    return (
        <div className='video-call-container'>
            <VideoCall roomID={roomID} />
        </div>
    );
};

export default VideoCallPage;
