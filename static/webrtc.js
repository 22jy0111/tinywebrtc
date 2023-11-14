// WebRTCのコネクションオブジェクトを作成
let peer = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
let rtpSender = null;

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
    console.log(sdp);
    await peer.setRemoteDescription(sessionDescription);

    // Offer SDPの場合はAnswer SDPを作成
    console.log(sessionDescription.type)
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

// デバイスIDの一覧を取得
let cameraDeviceIds = [];
let audioDeviceIds = [];
await navigator.mediaDevices.enumerateDevices().then((mds) => {
    for (let i = 0; i < mds.length; i++) {
        let kind = mds[i].kind;
        let deviceId = mds[i].deviceId;
        let label = mds[i].label;

        // "videoinput" camera
        if (kind === "videoinput") {
            cameraDeviceIds[deviceId] = label; 
        // "audioinput" microphone
        } else if (kind === "audioinput") {
            audioDeviceIds[deviceId] = label; 
        }
    }
});

async function getMediaStream(ids) {
    try {
        let mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { max: 1920 },
                height: { max: 1080 },
                deviceId: ids.camera,
            },
            audio: {
                deviceId: ids.audio,
            }
        });
        return mediaStream;
    } catch (e) {
        console.log("Could not get media");
        function getFakeStream() {
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = 1;
            // NOTE: これがないとFirefoxが通らない
            canvas.getContext('2d');
            return vStream = canvas.captureStream();
        }

        return navigator.mediaDevices.getDisplayMedia();
    }
}

function addOption(selectId, id, label) {
    let select = document.getElementById(selectId);
    let option = document.createElement("option");
    option.value = id;
    option.text = label;
    select.appendChild(option);
}

function getSelectDeviceId(elements) {
    try {
        // cameraIdを取得
        let cameraId = elements.cameras.options[cameras.selectedIndex].value;
        // audioIdを取得
        let audioId = elements.audios.options[audios.selectedIndex].value;
        return {camera: cameraId, audio: audioId}

    } catch (e) {
        return null;
    }
}

async function main() {
    Object.keys(cameraDeviceIds).forEach(e => {
        addOption("cameras", e, cameraDeviceIds[e]);
    })
    Object.keys(audioDeviceIds).forEach(e => {
        addOption("audios", e, audioDeviceIds[e]);
    })

    // roomIdを取得
    const roomId = new URL(window.location.href).searchParams.get("r");

    // ビデオストリームを取得
    let cameras = document.getElementById("cameras");
    let audios = document.getElementById("audios");

    let myMediaStream = await getMediaStream(getSelectDeviceId({
        cameras: cameras,
        audios: audios
    }));

    const myVideo = document.getElementById("my-video");
    const otherVideo = document.getElementById("other-video");

    // 自身のビデオストリームを設定
    if (myMediaStream != null) {
        myVideo.srcObject = myMediaStream;
        myMediaStream.getTracks().forEach((track) => {
            rtpSender = peer.addTrack(track, myMediaStream);
        });
    }

    // 変更されたとき
    cameras.addEventListener("change", async () => {
        myMediaStream.getVideoTracks().forEach((track) => {
            track.stop();
        });

        myMediaStream = await getMediaStream(getSelectDeviceId({
            cameras: cameras,
            audios: audios
        }));

        if (myMediaStream != null) {
            myVideo.srcObject = myMediaStream;
            myMediaStream.getTracks().forEach((track) => {
                peer.addTrack(track, myMediaStream);
            });
        }
    })
    audios.addEventListener("change", async () => {
        myMediaStream.getVideoTracks().forEach((track) => {
            track.stop();
        });

        myMediaStream = await getMediaStream(getSelectDeviceId({
            cameras: cameras,
            audios: audios
        }));

        if (myMediaStream != null) {
            myVideo.srcObject = myMediaStream;
            myMediaStream.getTracks().forEach((track) => peer.addTrack(track, myMediaStream));
        }
    })

    // ICE Candidateが生成された時の処理
    peer.addEventListener("icecandidate", (event) => {
        if (event.candidate === null) return;
        iceCandidates.push(event.candidate);

        let ice = JSON.stringify(iceCandidates, null, 2);
        socket.emit("broadcastICE", ice);
        console.log('ice candidate')
    });

    // Trackを取得した時の処理
    peer.addEventListener("track", (event) => {
        console.log("get video")
        otherVideo.srcObject = event.streams[0];
    });

    const socket = io();

    socket.on("connect", () => {
        console.log("connect");

        socket.emit("join", roomId);

        socket.on("requestSDPOffer", async () => {
            let sdpOffer = await createSDPOffer();
            console.log(`requestSDPOffer: ${sdpOffer}`);
            socket.emit("responseSDPOffer", sdpOffer);
        });

        socket.on("broadcastSDPOffer", async (sdpOffer) => {
            console.log(`broadcastSDPOffer: ${sdpOffer}`);
            if (sdpOffer != null) {
                let sdpAnswer = await receiveSDP(sdpOffer);
                if (sdpAnswer != null) {
                    socket.emit("responseSDPAnswer", sdpAnswer);
                }
            }
        });

        socket.on("broadcastICE", async (ice) => {
            console.log(`broadcastICE`);
            await receiveICE(ice);
            socket.emit("iceReceive");
        });
    });
}

main();
