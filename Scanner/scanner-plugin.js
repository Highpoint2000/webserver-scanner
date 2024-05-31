//////////////////////////////////////////////////////////////////////////////////////
///                                                                                ///
///  SCANNER SCRIPT FOR FM-DX-WEBSERVER (V1.0a)                                    ///
///                                                                                /// 
///  by Highpoint                                                                  ///
///  mod by PE5PVB - Will only work with PE5PVB ESP32 firmware                     ///
///																				   ///
///                                                        last update: 31.05.24   ///
//////////////////////////////////////////////////////////////////////////////////////

const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const host = window.location.host;
const wsUrl = `${protocol}//${host}/text`;

function sendCommandToClient(command) {
    let frequencySocket = new WebSocket(wsUrl);

    frequencySocket.addEventListener("open", () => {
        console.log("WebSocket-Connected.");
        frequencySocket.send(command);
        frequencySocket.close();
    });

    frequencySocket.addEventListener("error", (error) => {
        console.error("WebSocket-error:", error);
    });

    frequencySocket.addEventListener("close", () => {
        console.log("WebSocket-Closed.");
    });
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
        sendCommandToClient('C1');
    });

    ScannerUpButton.addEventListener('click', function() {
        sendCommandToClient('C2');
    });
}

document.addEventListener('DOMContentLoaded', function() {
    ScannerButtons();
});
