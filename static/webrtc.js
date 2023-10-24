let socket = io();

let message = "hello";

setInterval(() => {
    socket.emit('message', message);
}, 3000);

socket.on('message', (msg) => {
    console.log(msg);
})

// 各種HTML要素を取得
const myVideo = document.getElementById("my-video");
const otherVideo = document.getElementById("other-video");

const sdpOutput = document.getElementById("sdp-output");
const sdpInput = document.getElementById("sdp-input");

const sdpCreateOfferButton = document.getElementById("sdp-create-offer-button");
const sdpReceiveButton = document.getElementById("sdp-receive-button");

const iceOutput = document.getElementById("ice-output");
const iceInput = document.getElementById("ice-input");

const iceReceiveButton = document.getElementById("ice-receive-button");

// WebRTCのコネクションオブジェクトを作成
const peer = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });

// 自身のビデオストリームを取得
const myMediaStream = await navigator.mediaDevices.getUserMedia({
    video: {
        width: 800,
        height: 600,
    },
    audio: true
});
myVideo.srcObject = myMediaStream;
// 自身のビデオストリームを設定
myMediaStream.getTracks().forEach((track) => peer.addTrack(track, myMediaStream));

// Offer SDPの作成処理
/*
sdpCreateOfferButton.addEventListener("click", async () => {
    const sessionDescription = await peer.createOffer();
    await peer.setLocalDescription(sessionDescription);
    sdpOutput.value = JSON.stringify(sessionDescription, null, 2);
});
*/
async function createSDPOffer() {
    const sessionDescription = await peer.createOffer();
    await peer.setLocalDescription(sessionDescription);
    return JSON.stringify(sessionDescription, null, 2);
}

// SDPの受け取り処理
/*
sdpReceiveButton.addEventListener("click", async () => {
    const sessionDescription = JSON.parse(sdpInput.value);
    await peer.setRemoteDescription(sessionDescription);

    // Offer SDPの場合はAnswer SDPを作成
    if (sessionDescription.type === "offer") {
        const sessionDescription = await peer.createAnswer();
        await peer.setLocalDescription(sessionDescription);
        sdpOutput.value = JSON.stringify(sessionDescription, null, 2);
    }
});
*/
async function receiveSDP(sdp) {
    const sessionDescription = JSON.parse(sdp);
    await peer.setRemoteDescription(sessionDescription);

    // Offer SDPの場合はAnswer SDPを作成
    if (sessionDescription.type === "offer") {
        const sessionDescription = await peer.createAnswer();
        await peer.setLocalDescription(sessionDescription);
        sdpOutput.value = JSON.stringify(sessionDescription, null, 2);
    }
}

// 自身のICE Candidateの一覧
const iceCandidates = [];
// ICE Candidateが生成された時の処理
peer.addEventListener("icecandidate", (event) => {
    if (event.candidate === null) return;
    iceCandidates.push(event.candidate);

    iceOutput.value = JSON.stringify(iceCandidates, null, 2);
});

// ICE Candidateの受け取り処理
/*
iceReceiveButton.addEventListener("click", async () => {
    const iceCandidates = JSON.parse(iceInput.value);
    for (const iceCandidate of iceCandidates) {
        console.log(iceCandidate)
        await peer.addIceCandidate(iceCandidate);
    }
});
*/
async function receiveICE(ice) {
    const iceCandidates = JSON.parse(ice);
    for (const iceCandidate of iceCandidates) {
        console.log(iceCandidate)
        await peer.addIceCandidate(iceCandidate);
    }
}

// Trackを取得した時の処理
peer.addEventListener("track", (event) => {
    otherVideo.srcObject = event.streams[0];
});