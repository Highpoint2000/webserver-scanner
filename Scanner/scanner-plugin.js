
//////////////////////////////////////////////////////////////////////////////////////
///                                                                                ///
///  SCANNER SCRIPT FOR FM-DX-WEBSERVER (V1.0)                                     ///
///                                                                                /// 
///  by Highpoint                                           last update: 22.05.24  ///
///                                                                                ///
//////////////////////////////////////////////////////////////////////////////////////

let scanInterval;
let currentFrequency = 0.0;
let previousFrequency = null;
let isScanning = false;
let frequencySocket = null;
let piCode = '';

const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const host = window.location.host;
const wsUrl = `${protocol}//${host}/text`;

function setupWebSocket() {
    if (!frequencySocket || frequencySocket.readyState === WebSocket.CLOSED) {
        frequencySocket = new WebSocket(wsUrl);

        frequencySocket.addEventListener("open", () => {
            console.log("WebSocket-Verbindung hergestellt.");
        });

        frequencySocket.addEventListener("message", (event) => {
                let parsedData = JSON.parse(event.data);
                let freq = parsedData.freq;

                if (typeof freq !== 'undefined' && freq !== null) {
                    let newFrequency = parseFloat(freq);
                    if (previousFrequency === null || Math.abs(newFrequency - previousFrequency) >= 0.1) {
                        currentFrequency = newFrequency;
                        previousFrequency = newFrequency;
                        // console.log('Aktuelle Frequenz aktualisiert:', currentFrequency);
                        sendDataToClient(currentFrequency);
                    }
                }

                überprüfePiCode(parsedData.pi);
        });

        frequencySocket.addEventListener("error", (error) => {
            console.error("WebSocket-Fehler:", error);
        });
    }
}

function sendDataToClient(frequency) {
    if (frequencySocket && frequencySocket.readyState === WebSocket.OPEN) {
        const dataToSend = `T${(frequency * 1000).toFixed(0)}`;
        frequencySocket.send(dataToSend);
    } else {
        console.error('WebSocket ist nicht geöffnet.');
    }
}

function startScan(direction) {
    if (isScanning) {
        clearInterval(scanInterval);
    }

    setupWebSocket();

    const tuningLowerLimit = parseFloat(document.querySelector('#tuner-desc .color-4').innerText.split(' MHz')[0]);
    const tuningUpperLimit = parseFloat(document.querySelector('#tuner-desc .color-4').innerText.split(' MHz')[1].split(' - ')[1]);

    function updateFrequency() {
        if (direction === 'up') {
            currentFrequency += 0.1;
            if (currentFrequency > tuningUpperLimit) {
                currentFrequency = tuningLowerLimit;
            }
        } else if (direction === 'down') {
            currentFrequency -= 0.1;
            if (currentFrequency < tuningLowerLimit) {
                currentFrequency = tuningUpperLimit;
            }
        }

        currentFrequency = Math.round(currentFrequency * 10) / 10;

        if (!isNaN(currentFrequency) && currentFrequency !== null) {
            sendDataToClient(currentFrequency);
        }
    }

    piCode = '?';
    updateFrequency();
    isScanning = true;
    scanInterval = setInterval(() => {
        updateFrequency();
    }, 500);
}

function überprüfePiCode(receivedPiCode) {
    if (receivedPiCode.length > 1) {
        clearInterval(scanInterval);
        isScanning = false;
        piCode = '?';
    }
}

function restartScan(direction) {
    clearInterval(scanInterval);
    isScanning = false;
    piCode = '?';
    setTimeout(() => startScan(direction), 150);
}

function ScannerButtons() {
    const ScannerDownButton = document.createElement('button');
    ScannerDownButton.id = 'scanner-down';
    ScannerDownButton.setAttribute('aria-label', 'Scan Down');
    ScannerDownButton.classList.add('rectangular-downbutton');
    ScannerDownButton.innerHTML = '<i class="fa-solid fa-chevron-left"></i><i class="fa-solid fa-chevron-left"></i>';

    const ScannerUpButton = document.createElement('button');
    ScannerUpButton.id = 'scanner-up';
    ScannerUpButton.setAttribute('aria-label', 'Scan Up');
    ScannerUpButton.classList.add('rectangular-upbutton');
    ScannerUpButton.innerHTML = '<i class="fa-solid fa-chevron-right"></i><i class="fa-solid fa-chevron-right"></i>';

    const rectangularButtonStyle = `
        .rectangular-downbutton {
            border: 3px solid #ccc;
            border-radius: 0px;
            padding: 5px 10px;
            background-color: #fff;
            color: #333;
            cursor: pointer;
            transition: background-color 0.3s, color 0.3s, border-color 0.3s;
            margin-left: 1px;
        }

        .rectangular-upbutton {
            border: 3px solid #ccc;
            border-radius: 0px;
            padding: 5px 10px;
            background-color: #fff;
            color: #333;
            cursor: pointer;
            transition: background-color 0.3s, color 0.3s, border-color 0.3s;
            margin-right: 1px;
        }

        .rectangular-button:hover {
            background-color: #f0f0f0;
            border-color: #aaa;
        }
		
		#commandinput {
		text-align: left;
}
    `;

    const styleElement = document.createElement('style');
    styleElement.innerHTML = rectangularButtonStyle;
    document.head.appendChild(styleElement);

    const freqDownButton = document.getElementById('freq-down');
    freqDownButton.parentNode.insertBefore(ScannerDownButton, freqDownButton.nextSibling);

    const freqUpButton = document.getElementById('freq-up');
    freqUpButton.parentNode.insertBefore(ScannerUpButton, freqUpButton);

    ScannerDownButton.addEventListener('click', function() {
        restartScan('down');
    });

    ScannerUpButton.addEventListener('click', function() {
        restartScan('up');
    });

    const tuningLowerLimit = parseFloat(document.querySelector('#tuner-desc .color-4').innerText.split(' MHz')[0]);
    const tuningUpperLimit = parseFloat(document.querySelector('#tuner-desc .color-4').innerText.split(' MHz')[1].split(' - ')[1]);
}

document.addEventListener('DOMContentLoaded', function() {
    setupWebSocket();
    ScannerButtons();
});
