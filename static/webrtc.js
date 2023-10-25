// WebRTCのコネクションオブジェクトを作成
const peer = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });

// 自身のICE Candidateの一覧
const iceCandidates = [];

// Offer SDPの作成処理
async function createSDPOffer() {
    const sessionDescription = await peer.createOffer();
    await peer.setLocalDescription(sessionDescription);
    return JSON.stringify(sessionDescription, null, 2);
}

// SDPの受け取り処理
async function receiveSDP(sdp) {
    const sessionDescription = JSON.parse(sdp);
    console.error(sdp);
    await peer.setRemoteDescription(sessionDescription);

    // Offer SDPの場合はAnswer SDPを作成
    if (sessionDescription.type === "offer") {
        const sessionDescription = await peer.createAnswer();
        await peer.setLocalDescription(sessionDescription);
        return JSON.stringify(sessionDescription, null, 2);
    }

    return null;
}

// ICE Candidateの受け取り処理
async function receiveICE(ice) {
    const iceCandidates = JSON.parse(ice);
    for (const iceCandidate of iceCandidates) {
        console.log(iceCandidate)
        await peer.addIceCandidate(iceCandidate);
    }
}

async function main() {
    // 自身のビデオストリームを取得
    let myMediaStream = null;
    try {
        myMediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: 800,
                height: 600,
            },
            audio: true
        });
    } catch {
        console.log('Could not get media');
    }

    const myVideo = document.getElementById("my-video");
    const otherVideo = document.getElementById("other-video");

    // 自身のビデオストリームを設定
    if (myMediaStream != null) {
        myVideo.srcObject = myMediaStream;
        myMediaStream.getTracks().forEach((track) => peer.addTrack(track, myMediaStream));
    }

    // ICE Candidateが生成された時の処理
    peer.addEventListener("icecandidate", (event) => {
        if (event.candidate === null) return;
        iceCandidates.push(event.candidate);

        let ice = JSON.stringify(iceCandidates, null, 2);
        socket.emit('broadcastICE', ice);
    });

    // Trackを取得した時の処理
    peer.addEventListener("track", (event) => {
        otherVideo.srcObject = event.streams[0];
    });

    const socket = io();

    socket.on('connect', () => {
        console.log('connect');

        socket.on('requestSDPOffer', async () => {
            let sdpOffer = await createSDPOffer();
            console.log(`requestSDPOffer: ${sdpOffer}`);
            socket.emit('responseSDPOffer', sdpOffer);
        });

        socket.on('broadcastSDPOffer', async (sdpOffer) => {
            console.log(`broadcastSDPOffer: ${sdpOffer}`);
            if (sdpOffer != null) {
                let sdpAnswer = await receiveSDP(sdpOffer);
                if (sdpAnswer != null) {
                    socket.emit('responseSDPAnswer', sdpAnswer);
                }
            }
        });

        socket.on('broadcastICE', async (ice) => {
            console.log(`broadcastICE`);
            await receiveICE(ice);
            socket.emit('iceReceive');
        });
    });
}

main();
