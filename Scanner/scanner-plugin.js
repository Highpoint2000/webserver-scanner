//////////////////////////////////////////////////////////////////////////////////////
///                                                                                ///
///  SCANNER SCRIPT FOR FM-DX-WEBSERVER (V1.1)                                     ///
///                                                                                /// 
///  by Highpoint                                                                  ///
///  mod by PE5PVB - Will only work with PE5PVB ESP32 firmware                     ///
///																				   ///
///                                                        last update: 31.05.24   ///
//////////////////////////////////////////////////////////////////////////////////////

const isESP32WithPE5PVB = true;  // Set to true if ESP32 with PE5PVB firmware is being used

//////////////////////////////////////////////////////////////////////////////////////

(() => {
    const scannerPlugin = (() => {   

        let scanInterval;
        let currentFrequency = 0.0;
        let previousFrequency = null;
        let previousPiCode = null;
        let isScanning = false;
        let frequencySocket = null;
        let piCode = '?';

        const localHost = window.location.host;
        const wsUrl = `ws://${localHost}/text`;

        function setupWebSocket() {
            // WebSocket setup
            if (!isESP32WithPE5PVB) {
                if (!frequencySocket || frequencySocket.readyState === WebSocket.CLOSED) {
                    frequencySocket = new WebSocket(wsUrl);

                    frequencySocket.addEventListener("open", () => {
                        console.log("WebSocket connected.");
                    });

                    frequencySocket.addEventListener("error", (error) => {
                        console.error("WebSocket error:", error);
                    });

                    frequencySocket.addEventListener("close", () => {
                        console.log("WebSocket closed.");
                        // Try to reconnect
                        setTimeout(setupWebSocket, 1000);
                    });
                }
            }
        }

        function sendDataToClient(frequency) {
            // Send data via WebSocket
            if (frequencySocket && frequencySocket.readyState === WebSocket.OPEN) {
                const dataToSend = `T${(frequency * 1000).toFixed(0)}`;
                frequencySocket.send(dataToSend);
                console.log("WebSocket sent:", dataToSend);
            } else {
                console.error('WebSocket not open.');
                setTimeout(() => sendDataToClient(frequency), 500); // Retry after a short delay
            }
        }

        // Function to send a command to the client via WebSockets
        function sendCommandToClient(command) {
            // Determine the WebSocket protocol based on the current page
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            // Determine the host of the current page
            const host = window.location.host;
            // Construct the WebSocket URL
            const wsUrl = `${protocol}//${host}/text`;

            // Create a WebSocket connection to the specified URL
            const autoScanSocket = new WebSocket(wsUrl);

            // Event listener for opening the WebSocket connection
            autoScanSocket.addEventListener("open", () => {
                console.log("WebSocket connected.");
                // Send the command via the WebSocket connection
                console.log("Sending command:", command);
                autoScanSocket.send(command);
            });

            // Event listener for WebSocket errors
            autoScanSocket.addEventListener("error", (error) => {
                console.error("WebSocket error:", error);
            });

            // Event listener for receiving a message from the server
            autoScanSocket.addEventListener("message", (event) => {
                // Close the WebSocket connection after receiving the response
                autoScanSocket.close();
            });

            // Event listener for closing the WebSocket connection
            autoScanSocket.addEventListener("close", () => {
                console.log("WebSocket closed.");
            });
        }

        function waitForServer() {
            // Wait for the server to be available
            if (typeof window.socket !== "undefined") {
                window.socket.addEventListener("message", (event) => {
                    const parsedData = JSON.parse(event.data);
                    const newPiCode = parsedData.pi;
                    const freq = parsedData.freq;

                    if (newPiCode !== previousPiCode) {
                        previousPiCode = newPiCode;
                        if (!isESP32WithPE5PVB) {
                            checkPiCode(newPiCode);
                        }
                    }

                    if (freq !== previousFrequency) {
                        previousFrequency = freq;
                    }

                    currentFrequency = freq;
                });
            } else {
                console.error('Socket is not defined.');
                setTimeout(waitForServer, 250);
            }
        }

        waitForServer();

        function startScan(direction) {
            // Start scanning in the specified direction
            console.log('Scan started in direction:', direction);

            if (isScanning) {
                clearInterval(scanInterval);
                console.log('Previous scan stopped.');
            }

            const tuningRangeText = document.querySelector('#tuner-desc .color-4').innerText;
            const tuningLowerLimit = parseFloat(tuningRangeText.split(' MHz')[0]);
            const tuningUpperLimit = parseFloat(tuningRangeText.split(' MHz')[1].split(' - ')[1]);

            if (isNaN(currentFrequency) || currentFrequency === 0.0) {
                currentFrequency = tuningLowerLimit;
            }

            function updateFrequency() {
                currentFrequency = Math.round(currentFrequency * 10) / 10; // Round to one decimal place
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
                console.log("Current frequency:", currentFrequency);
                sendDataToClient(currentFrequency);
            }

            piCode = '?';
            updateFrequency();
            isScanning = true;
            scanInterval = setInterval(updateFrequency, 500);
            console.log('New scan started.');
        }

        function checkPiCode(receivedPiCode) {
            // Check if the received Pi code is valid
            if (receivedPiCode.length > 1) {
                clearInterval(scanInterval);
                isScanning = false;
                piCode = '?';
                console.log('Scan aborted because the Pi code has more than one character.');
            }
        }

        function restartScan(direction) {
            // Restart scanning in the specified direction
            console.log('Restarting scan in direction:', direction);
            clearInterval(scanInterval);
            isScanning = false;
            piCode = '?';
            setTimeout(() => startScan(direction), 150);
        }

        function ScannerButtons() {
            // Create buttons for controlling the scanner
            const scannerDownButton = document.createElement('button');
            scannerDownButton.id = 'scanner-down';
            scannerDownButton.setAttribute('aria-label', 'Scan Down');
            scannerDownButton.classList.add('rectangular-downbutton');
            scannerDownButton.innerHTML = '<i class="fa-solid fa-chevron-left"></i><i class="fa-solid fa-chevron-left"></i>';

            const scannerUpButton = document.createElement('button');
            scannerUpButton.id = 'scanner-up';
            scannerUpButton.setAttribute('aria-label', 'Scan Up');
            scannerUpButton.classList.add('rectangular-upbutton');
            scannerUpButton.innerHTML = '<i class="fa-solid fa-chevron-right"></i><i class="fa-solid fa-chevron-right"></i>';

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
            `;

            const styleElement = document.createElement('style');
            styleElement.innerHTML = rectangularButtonStyle;
            document.head.appendChild(styleElement);

            const freqDownButton = document.getElementById('freq-down');
            freqDownButton.parentNode.insertBefore(scannerDownButton, freqDownButton.nextSibling);

            const freqUpButton = document.getElementById('freq-up');
            freqUpButton.parentNode.insertBefore(scannerUpButton, freqUpButton);

            if (isESP32WithPE5PVB) {
                scannerDownButton.addEventListener('click', function() {
                    sendCommandToClient('C1');
                });

                scannerUpButton.addEventListener('click', function() {
                    sendCommandToClient('C2');
                });
            } else {
                scannerDownButton.addEventListener('click', function() {
                    restartScan('down');
                });

                scannerUpButton.addEventListener('click', function() {
                    restartScan('up');
                });
            }
        }

        // WebSocket and scanner button initialization
        setupWebSocket();
        ScannerButtons();
    })();

    // AUTO Scan INSERTER FOR FM-DX-WEBSERVER (V1.0)
    // by Highpoint
    // powered by PE5PVB
    // last update: 31.05.24

    // Function to send a command to the client via WebSockets
    function sendCommandToClient(command) {
        // Determine the WebSocket protocol based on the current page
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // Determine the host of the current page
        const host = window.location.host;
        // Construct the WebSocket URL
        const wsUrl = `${protocol}//${host}/text`;

        // Create a WebSocket connection to the specified URL
        const autoScanSocket = new WebSocket(wsUrl);

        // Event listener for opening the WebSocket connection
        autoScanSocket.addEventListener("open", () => {
            console.log("WebSocket-Connected.");
            // Send the command via the WebSocket connection
            console.log("Sending command:", command);
            autoScanSocket.send(command);
        });

        // Event listener for WebSocket errors
        autoScanSocket.addEventListener("error", (error) => {
            console.error("WebSocket-error:", error);
        });

        // Event listener for receiving a message from the server
        autoScanSocket.addEventListener("message", (event) => {
            // Close the WebSocket connection after receiving the response
            autoScanSocket.close();
        });

        // Event listener for closing the WebSocket connection
        autoScanSocket.addEventListener("close", () => {
            console.log("WebSocket-Closed.");
        });
    }

function setCookie(name, value, days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + date.toUTCString();
    document.cookie = name + "=" + value + ";" + expires + ";path=/";
}

function getCookie(name) {
    const cookieName = name + "=";
    const decodedCookie = decodeURIComponent(document.cookie);
    const cookieArray = decodedCookie.split(';');
    for (let i = 0; i < cookieArray.length; i++) {
        let cookie = cookieArray[i];
        while (cookie.charAt(0) == ' ') {
            cookie = cookie.substring(1);
        }
        if (cookie.indexOf(cookieName) == 0) {
            return cookie.substring(cookieName.length, cookie.length);
        }
    }
    return "";
}

function initialize() {
    const ScannerButton = document.createElement('button');
	ScannerButton.classList.add('hide-phone');
    ScannerButton.id = 'Scan-on-off';
    ScannerButton.setAttribute('aria-label', 'Scan');
    ScannerButton.setAttribute('data-tooltip', 'Auto Scan on/off');
    ScannerButton.style.borderRadius = '0px 0px 0px 0px';
    ScannerButton.style.width = 'calc(100% - 2px)';
    ScannerButton.style.margin = '0 1px';
    ScannerButton.style.position = 'relative';
    ScannerButton.style.top = '0px';
    ScannerButton.style.right = '0px';
    ScannerButton.innerHTML = 'Auto Scan<br><strong>OFF</strong>';
    ScannerButton.classList.add('bg-color-3');

	if (isESP32WithPE5PVB) {

    const buttonEq = document.querySelector('.button-eq');
    const buttonIms = document.querySelector('.button-ims');

	const newDiv = document.createElement('div');
	newDiv.className = "hide-phone panel-50 no-bg h-100 m-0";
	newDiv.appendChild(ScannerButton);

    buttonEq.parentNode.insertBefore(newDiv, buttonIms);

	}

    let isScanOn = getCookie('isScanOn') === 'true';
    let blinkInterval;

    function toggleScan() {
        const ScanButton = document.getElementById('Scan-on-off');
        isScanOn = !isScanOn;
        setCookie('isScanOn', isScanOn, 365);

        if (isScanOn) {
            ScanButton.classList.remove('bg-color-3');
            ScanButton.classList.add('bg-color-4');
            clearInterval(blinkInterval);
			sendCommandToClient('J1');
            blinkInterval = setInterval(function() {
                ScanButton.classList.toggle('bg-color-3');
                ScanButton.classList.toggle('bg-color-4');
            }, 500);
        } else {
            ScanButton.classList.remove('bg-color-4');
            ScanButton.classList.add('bg-color-3');
            clearInterval(blinkInterval);
			sendCommandToClient('J0');
        }
        // Adjust button text based on state
        ScanButton.innerHTML = `Auto Scan<br><strong>${isScanOn ? 'ON' : 'OFF'}</strong>`;
        // Add any other actions here, like sending commands to the client
    }

    const ScanButton = document.getElementById('Scan-on-off');
    ScanButton.addEventListener('click', toggleScan);

    // Start blinking if button initially set to ON
    if (isScanOn) {
        blinkInterval = setInterval(function() {
            ScanButton.classList.toggle('bg-color-3');
            ScanButton.classList.toggle('bg-color-4');
        }, 500);
    }
}

// Initialize the customizations after the page loads
window.addEventListener('load', initialize);


})();
