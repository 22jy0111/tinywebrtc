// WebRTCのコネクションオブジェクトを作成
let peer = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });

// 自身のICE Candidateの一覧
const iceCandidates = [];

// Offer SDPの作成処理
async function createSDPOffer() {
    const sessionDescription = await peer.createOffer({
        //iceRestart: true,
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
    });
    await peer.setLocalDescription(sessionDescription);
    return JSON.stringify(sessionDescription, null, 2);
}

// SDPの受け取り処理
async function receiveSDP(sdp, socket) {
    const sessionDescription = JSON.parse(sdp);
    await peer.setRemoteDescription(sessionDescription);

    // Offer SDPの場合はAnswer SDPを作成
    console.log(sessionDescription.type)
    if (sessionDescription.type === "offer") {
        const sessionDescription = await peer.createAnswer();
        await peer.setLocalDescription(sessionDescription);
        return JSON.stringify(sessionDescription, null, 2);
    }
    console.log('send sdpAnswerReceive')
    socket.emit('sdpAnswerReceive');
    return null;
}

// ICE Candidateの受け取り処理
async function receiveICE(ice) {
    console.log('recieve ice')
    const iceCandidates = JSON.parse(ice);
    console.log('iceCandidates:');
    //console.log(ice);
    for (const iceCandidate of iceCandidates) {
        console.log('ice candidate')
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

        return null;
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

    // ミュートボタン
    document.getElementById('muteBtn').addEventListener('click', (e) => {
        e.currentTarget.getElementsByTagName('i')[0].classList.toggle('bi-volume-mute-fill')
        e.currentTarget.getElementsByTagName('i')[0].classList.toggle('bi-volume-up-fill')

        let isMuted = e.currentTarget.getElementsByTagName('i')[0].classList.contains('bi-volume-mute-fill')
        let ov = document.getElementsByClassName('other-video');
        for (let i = 0; i < ov.length; i++) {
            ov[i].muted = isMuted;
        }
    });

    //画面共有ボタン
    document.getElementById('screenShareBtn').addEventListener('click', (e) => {
        navigator.mediaDevices.getDisplayMedia().then(m => {
            m.getTracks().forEach((track) => {
                myVideo.srcObject = m;
                peer.addTrack(track, m);
                track.addEventListener('ended', streamReget);
            })
        })
    });

    // 自身のビデオストリームを設定
    if (myMediaStream != null) {
        myVideo.srcObject = myMediaStream;
        myMediaStream.getTracks().forEach((track) => {
            peer.addTrack(track, myMediaStream);
            track.addEventListener('ended', streamReget);
        });
    }

    async function streamReget() {
        console.log('ended')
        myMediaStream.getVideoTracks().forEach((track) => {
            track.stop();
        });

        myMediaStream = await getMediaStream(getSelectDeviceId({
            cameras: cameras,
            audios: audios
        }));

        if (myMediaStream != null) {
            myVideo.srcObject = myMediaStream;
            myMediaStream.getTracks().forEach(track => peer.addTrack(track, myMediaStream));
        }
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
            myMediaStream.getTracks().forEach(track => peer.addTrack(track, myMediaStream));
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
            myMediaStream.getTracks().forEach(track => peer.addTrack(track, myMediaStream));
        }
    })

    // ICE Candidateが生成された時の処理
    peer.addEventListener("icecandidate", (event) => {
        if (event.candidate === null) {
            console.log('ice candidate null')
            return;
        };
        iceCandidates.push(event.candidate);
    });

    // Trackを取得した時の処理
    peer.addEventListener("track", (event) => {
        console.log('get video stream.length ' + event.streams.length)
        const isMuted = document.getElementById('muteBtn').getElementsByTagName('i')[0].classList.contains('bi-volume-mute-fill');

        let oldv = document.getElementsByClassName('other-video');
        for (let i = 0; i < oldv.length; i++) {
            oldv[i].remove();
        }

        event.streams.forEach(s => {
            let v = document.createElement('video');
            v.autoplay = true;
            v.muted = isMuted;
            v.srcObject = s;
            v.classList.add('col', 'rounded', 'p-0', 'm-1', 'other-video');
            document.getElementById('wrapper-other-video').appendChild(v);
            console.log('create video');
        });
    });

    const socket = io();

    socket.on("connect", () => {
        console.log("connect");
        socket.emit("join", roomId);
        console.log(socket.id);


        async function connectionStart() {
            let sdpOffer = await createSDPOffer();
            console.log("requestSDPOffer:");
            console.log(JSON.parse(sdpOffer));
            socket.emit("responseSDPOffer", sdpOffer);
        }

        socket.on("requestSDPOffer", connectionStart);
        peer.addEventListener('negotiationneeded', connectionStart)

        socket.on("broadcastSDPOffer", async (sdpOffer) => {
            console.log("broadcastSDPOffer:");
            console.log(JSON.parse(sdpOffer));
            if (sdpOffer != null) {
                let sdpAnswer = await receiveSDP(sdpOffer, socket);
                if (sdpAnswer != null) {
                    socket.emit("responseSDPAnswer", sdpAnswer);
                }
            }
        });

        socket.on("broadcastICE", async (ice) => {
            console.log(`broadcastICE`);
            console.log(JSON.parse(ice));
            await receiveICE(ice);
            socket.emit("iceReceive");
        });

        socket.on("requestICE", async () => {
            socket.emit("broadcastICE", JSON.stringify(iceCandidates, null, 2));
            console.log("requestICE");
        });
    });
}

main();
