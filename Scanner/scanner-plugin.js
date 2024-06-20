//////////////////////////////////////////////////////////////////////////////////////
///                                                                                ///
///  SCANNER SCRIPT FOR FM-DX-WEBSERVER (V1.3b)             last update: 18.06.24  ///
///                                                                                /// 
///  by Highpoint                                                                  ///
///  powered by PE5PVB                                                             ///     
///                                                                                ///
///  https://github.com/Highpoint2000/webserver-scanner                            ///
///                                                                                ///
//////////////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const Autoscan_PE5PVB_Mode = false; // Set to true if ESP32 with PE5PVB firmware is being used and you want to use the auto scan mode of the firmware
const Search_PE5PVB_Mode = false; // Set to true if ESP32 with PE5PVB firmware is being used and you want to use the search mode << >> of the firmware

// Only valid for Autoscan_PE5PVB_Mode = false
let defaultScanHoldTime = 5000; // Value in ms: 1000,3000,5000,7000,10000,15000,20000,30000   
let defaultSensitivityValue = 30; // Value in dBf: 5,10,15,20,25,30,35,40,45,50,55,60
let defaultScannerMode = 'normal'; // normal, blacklist, or whitelist

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const pluginVersion = 'V1.3b'; 

(() => {
    const scannerPlugin = (() => {  
	
		let delayValue = defaultScanHoldTime / 1000; 
		let sensitivityValue = defaultSensitivityValue; 
		let modeValue = defaultScannerMode;
		let checkStrengthCounter = 0;
        let scanInterval = null; // Variable to store the interval timer
        let currentFrequency = 0.0;
        let previousFrequency = null;
        let previousPiCode = null;
        let isScanning = false;
        let frequencySocket = null;
        let piCode = '?';
        let stereo_forced_user = 'stereo';
		let blinkInterval;
		let isScanOnValue = false;
		let mode = defaultScannerMode;
		let stereo_detect = false; // Initialization of the stereo_detect variable to false
		const millisecondsPerSecond = 10;
        const localHost = window.location.host;
        const wsUrl = `ws://${localHost}/text`;

        function setupWebSocket() {
            // WebSocket setup
            if (!Autoscan_PE5PVB_Mode) {
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
                        setTimeout(setupWebSocket, 300);
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
                setTimeout(() => sendDataToClient(frequency), 300); // Retry after a short delay
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
				window.socket.addEventListener("message", handleSocketMessage);
			} else {
				console.error('Socket is not defined.');
				setTimeout(waitForServer, 250);
			}
		}

		waitForServer();

		function handleSocketMessage(event) {
            const parsedData = JSON.parse(event.data);
            const txInfo = parsedData.txInfo;
            let PiCode, freq, strength, stereo, stereo_forced, station;

            setTimeout(() => {
                PiCode = parsedData.pi;
                freq = parsedData.freq;
                strength = parsedData.signal;
                stereo = parsedData.st;
                stereo_forced = parsedData.st_forced;
                station = txInfo.station;

                // console.log(isScanning, stereo_forced, stereo_forced_user, modeValue, station);

                if (isScanning === true) {
                    if (stereo_forced === true && stereo_forced_user !== 'mono') {
                        stereo_forced_user = 'mono';
                        sendCommandToClient('B0');
                    }
                } else {
                    if (stereo_forced_user === 'mono') {
                        sendCommandToClient('B1');
                        stereo_forced_user = 'stereo'; // Update stereo_forced_user after sending 'B1'
                    }
                } 

                if (freq !== previousFrequency) {
                    checkStrengthCounter = 0; // Reset the counter
                    stereo_detect = false; // Reset stereo_detect when frequency changes
                }
                previousFrequency = freq;
                currentFrequency = freq;
                checkStrengthCounter++;

                // Check for stereo detection between counter 4 and 99 (inclusive)
                if (checkStrengthCounter > 7) {
                    if (stereo === true) {
                        stereo_detect = true; // Set stereo_detect to true if stereo is true
                    }
                }
                //console.log(stereo, stereo_detect, checkStrengthCounter);

                if (!Autoscan_PE5PVB_Mode) {
                    checkStereo(stereo_detect, freq, strength, PiCode, station, checkStrengthCounter);
                }
            }, 0);
        }

        function startScan(direction) {
            if (isScanning) {
                return; // Do not start a new scan if one is already running
            }

            console.log('Scan started in direction:', direction);

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

                if (!Autoscan_PE5PVB_Mode) {
                    if (modeValue === 'blacklist') {
                        while (isInBlacklist(currentFrequency, blacklist)) {
                            console.log('Blacklist Frequency:', currentFrequency);
                            // Adjust frequency and continue checking until it's not in blacklist
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
                        }
                    } else if (modeValue === 'whitelist') {
                        while (!isInWhitelist(currentFrequency, whitelist)) {
                            //console.log('Not Whitelist Frequency:', currentFrequency);
                            // Adjust frequency and continue checking until it's in whitelist
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
                        }
                    }
                }

                sendDataToClient(currentFrequency);
            }

            isScanning = true;
            updateFrequency();
            scanInterval = setInterval(updateFrequency, 700);
        }

        // Function to check if a frequency is in the whitelist
        function isInWhitelist(currentFrequency, whitelist) {
            return whitelist.includes(currentFrequency.toString());
        }

        // Function to check if a frequency is in the blacklist
        function isInBlacklist(currentFrequency, blacklist) {
            return blacklist.includes(currentFrequency.toString());
        }

        let blacklist = [];

        // Check and initialize blacklist
        function checkBlacklist() {
            const blacklistProtocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
            const port = window.location.port;
            const host = document.location.hostname;
            const blacklistUrl = `${blacklistProtocol}//${host}:${port}/scanner/blacklist.txt`;

            fetch(blacklistUrl)
                .then(response => {
                    if (response.ok) {
                        return response.text();
                    } else {
                        throw new Error(`Error fetching blacklist: ${response.status} ${response.statusText}`);
                    }
                })
                .then(data => {
                    blacklist = data.split('\n').map(frequency => frequency.trim()).filter(Boolean);
					blacklist = blacklist.map(value => parseFloat(value).toString());
					
                    console.log('Blacklist initialized:', blacklist);
                })
                .catch(error => {
                    console.error('Error checking blacklist:', error.message);
                    blacklist = [];
                });
        }

        checkBlacklist();
		
		let whitelist = [];

        // Check and initialize whitelist
        function checkWhitelist() {
            const whitelistProtocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
            const port = window.location.port;
            const host = document.location.hostname;
            const whitelistUrl = `${whitelistProtocol}//${host}:${port}/scanner/whitelist.txt`;

            fetch(whitelistUrl)
                .then(response => {
                    if (response.ok) {
                        return response.text();
                    } else {
                        throw new Error(`Error fetching whitelist: ${response.status} ${response.statusText}`);
                    }
                })
                .then(data => {
                    whitelist = data.split('\n').map(frequency => frequency.trim()).filter(Boolean);
					whitelist = whitelist.map(value => parseFloat(value).toString());
					
                    console.log('Whitelist initialized:', whitelist);
                })
                .catch(error => {
                    console.error('Error checking whitelist:', error.message);
                    whitelist = [];
                });
        }

        checkWhitelist();	

        let scanTimeout; // Variable to hold the timeout

        function AutoScan() {
            if (isScanOnValue && !isScanning) {
                startScan('up'); // Start scanning once
            }
        }

        function checkStereo(stereo_detect, freq, strength, PiCode, station, checkStrengthCounter) {
            if (stereo_detect === true || PiCode.length > 1) {
                clearInterval(scanInterval); // Clears a previously defined scanning interval
                isScanning = false; // Updates a flag indicating scanning status

                if (strength > sensitivityValue || PiCode.length > 1) {
                    let delayValueMilliseconds = delayValue * 10;

                    if (PiCode.length > 1) {
                        delayValueMilliseconds += 50;
                    }

                    handleStationTimeout = setTimeout(() => {
                        if (isScanOnValue) {
                            if (station.length > 2) {
                                startScan('up'); // Restart scanning after the delay
                                checkStrengthCounter = 0; // Reset the counter
                                station = '';
                                stereo_detect = false;
                                startScan('up');
                            } else {
                                if (checkStrengthCounter > delayValueMilliseconds) {
                                    startScan('up'); // Restart scanning after the delay
                                    checkStrengthCounter = 0; // Reset the counter
                                    stereo_detect = false;
                                    station = '';
                                    startScan('up');
                                }
                            }
                        }
                    }, 100); // Delay of 100 ms before handling station details
                } else {
                    if (isScanOnValue) {
                        clearInterval(scanInterval); // Clears a previously defined scanning interval
                        stereo_detect = false;
                        station = '';
                        startScan('up');
                    }
                }
            } else {
                if (isScanOnValue) {
                    let delayValueMilliseconds = delayValue * 10;
                    if (checkStrengthCounter > delayValueMilliseconds) {
                        clearInterval(scanInterval); // Clears a previously defined scanning interval
                        isScanning = false; // Updates a flag indicating scanning status
                        stereo_detect = false;
                        station = '';
                        startScan('up');
                    }
                }
            }
        }

        function stopAutoScan() {
            clearInterval(scanInterval); // Stops the scan interval
            isScanning = false; // Disables scanning
            clearTimeout(scanTimeout); // Clear any existing scan timeout
        }

        function restartScan(direction) {
            // Restart scanning in the specified direction
            clearInterval(scanInterval);
            isScanning = false;
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

            if (Search_PE5PVB_Mode) {
                scannerDownButton.addEventListener('click', function () {
                    sendCommandToClient('C1');
                });

                scannerUpButton.addEventListener('click', function () {
                    sendCommandToClient('C2');
                });
            } else {
                scannerDownButton.addEventListener('click', function () {
                    restartScan('down');
                });

                scannerUpButton.addEventListener('click', function () {
                    restartScan('up');
                });
            }
        }

        // WebSocket and scanner button initialization
        setupWebSocket();
        ScannerButtons();

        window.addEventListener('load', initialize);

        function initialize() {
            const ScannerButton = document.createElement('button');
            ScannerButton.classList.add('hide-phone');
            ScannerButton.id = 'Scan-on-off';
            ScannerButton.setAttribute('aria-label', 'Scan');
            ScannerButton.setAttribute('data-tooltip', 'Auto Scan on/off');
            ScannerButton.setAttribute('data-scan-status', 'off');
            ScannerButton.style.borderRadius = '0px 0px 0px 0px';
            ScannerButton.style.position = 'relative';
            ScannerButton.style.top = '0px';
            ScannerButton.style.right = '0px';
            ScannerButton.innerHTML = '<strong>Auto<br>Scan</strong>';
            ScannerButton.classList.add('bg-color-3');
            ScannerButton.title = `Plugin Version ${pluginVersion}`;

            // Check if a button with the label "Mute" exists
            const muteButton = document.querySelector('button[aria-label="Mute"]');
            if (muteButton) {
                ScannerButton.style.width = 'calc(100% - 1px)';
                ScannerButton.style.marginLeft = '-1px';
            } else {
                ScannerButton.style.width = 'calc(100% - 2px)';
                ScannerButton.style.marginLeft = '0px';
            }
			
            if (isTuneAuthenticated) {
                const buttonEq = document.querySelector('.button-eq');
                const buttonIms = document.querySelector('.button-ims');

                const newDiv = document.createElement('div');
                newDiv.className = "hide-phone panel-50 no-bg h-100 m-0";
                newDiv.appendChild(ScannerButton);

                buttonEq.parentNode.insertBefore(newDiv, buttonIms);
            }

            function toggleScan() {
                const ScanButton = document.getElementById('Scan-on-off');
                const isScanOn = ScanButton.getAttribute('data-scan-status') === 'on';

                if (isScanOn) {
                    ScanButton.setAttribute('data-scan-status', 'off');
                    ScanButton.classList.remove('bg-color-4');
                    ScanButton.classList.add('bg-color-3');
                    clearInterval(blinkInterval);

                    stopAutoScan(); // Stop the scan process

                    if (Autoscan_PE5PVB_Mode) {
                        sendCommandToClient('J0');
                    }

                    saveDropdownValues();

                    const scannerControls = document.getElementById('scanner-controls');
                    if (scannerControls) {
                        scannerControls.parentNode.removeChild(scannerControls);
                    }

                    const volumeSliderParent = document.getElementById('volumeSlider').parentNode;
                    volumeSliderParent.style.display = 'block';
					isScanOnValue = false;
                } else {
                    ScanButton.setAttribute('data-scan-status', 'on');
					isScanOnValue = true;
                    ScanButton.classList.remove('bg-color-3');
                    ScanButton.classList.add('bg-color-4');
                    clearInterval(blinkInterval);

                    if (Autoscan_PE5PVB_Mode) {
                        sendCommandToClient('J1');
                    } else {
                        AutoScan();
                    }

                    blinkInterval = setInterval(function () {
                        ScanButton.classList.toggle('bg-color-3');
                        ScanButton.classList.toggle('bg-color-4');
                    }, 500);

                    createScannerControls();
                }
            }

            const ScanButton = document.getElementById('Scan-on-off');
            ScanButton.addEventListener('click', toggleScan);

            // Start blinking if the button is set to ON when the page loads
            if (ScanButton.getAttribute('data-scan-status') === 'on') {
                blinkInterval = setInterval(function () {
                    ScanButton.classList.toggle('bg-color-3');
                    ScanButton.classList.toggle('bg-color-4');
                }, 500);
            } else {
                // Show the volume slider when the scanner starts
                const volumeSliderParent = document.getElementById('volumeSlider').parentNode;
                volumeSliderParent.style.display = 'block';
            }
        }

        function createScannerControls() {
            // Create a flex container for scanner sensitivity and scanner delay
            const scannerControls = document.createElement('div');
            scannerControls.className = "panel-50 no-bg h-100";
            scannerControls.id = "scanner-controls";
            scannerControls.style.width = '96%';
            scannerControls.style.display = 'flex';
            scannerControls.style.justifyContent = 'space-between';
            scannerControls.style.marginTop = "0px";
            scannerControls.style.position = 'relative'; // Make sure it's on top

            const modeContainer = document.createElement('div');
            modeContainer.className = "dropdown";
            modeContainer.style.marginRight = "10px";
            modeContainer.style.marginLeft = "0px";
            modeContainer.style.width = "100%";
            modeContainer.style.height = "99%";
            modeContainer.style.position = 'relative'; // Make sure it's on top		
            modeContainer.innerHTML = `
                <input type="text" placeholder="${modeValue}" title="Scanner Mode" readonly>
                <ul class="options open-top" style="position: absolute; display: none; bottom: 100%; margin-bottom: 5px;">
                    <li data-value="normal" class="option">normal</li>
                    <li data-value="blacklist" class="option">blacklist</li>
                    <li data-value="whitelist" class="option">whitelist</li>
                </ul>
            `;

            const sensitivityContainer = document.createElement('div');
            sensitivityContainer.className = "dropdown";
            sensitivityContainer.style.marginRight = "5px";
            sensitivityContainer.style.marginLeft = "-5px";
            sensitivityContainer.style.width = "100%";
            sensitivityContainer.style.height = "99%";
            sensitivityContainer.style.position = 'relative'; // Make sure it's on top

            if (Autoscan_PE5PVB_Mode) {
                sensitivityContainer.innerHTML = `
                    <input type="text" placeholder="Sensitivity" title="Scanner Sensitivity" readonly>
                    <ul class="options open-top" style="position: absolute; display: none; bottom: 100%; margin-bottom: 5px;">
                        <li data-value="1" class="option">1</li>
                        <li data-value="5" class="option">5</li>
                        <li data-value="10" class="option">10</li>
                        <li data-value="15" class="option">15</li>
                        <li data-value="20" class="option">20</li>
                        <li data-value="25" class="option">25</li>
                        <li data-value="30" class="option">30</li>
                    </ul>
                `;
            } else {
                sensitivityContainer.innerHTML = `
                    <input type="text" placeholder="${sensitivityValue} dBf" title="Scanner Sensitivity" readonly>
                    <ul class="options open-top" style="position: absolute; display: none; bottom: 100%; margin-bottom: 5px;">
                        <li data-value="5" class="option">5 dBf</li>
                        <li data-value="10" class="option">10 dBf</li>
                        <li data-value="15" class="option">15 dBf</li>
                        <li data-value="20" class="option">20 dBf</li>
                        <li data-value="25" class="option">25 dBf</li>
                        <li data-value="30" class="option">30 dBf</li>
                        <li data-value="35" class="option">35 dBf</li>
                        <li data-value="40" class="option">40 dBf</li>
                        <li data-value="45" class="option">45 dBf</li>
                        <li data-value="50" class="option">50 dBf</li>
                        <li data-value="55" class="option">55 dBf</li>
                        <li data-value="60" class="option">60 dBf</li>
                    </ul>
                `;
            }

            const delayContainer = document.createElement('div');
            delayContainer.className = "dropdown";
            delayContainer.style.marginLeft = "0px";
            delayContainer.style.marginRight = "-5px";
            delayContainer.style.width = "100%";
            delayContainer.style.height = "99%";
            delayContainer.style.position = 'relative'; // Make sure it's on top

            if (Autoscan_PE5PVB_Mode) {
                delayContainer.innerHTML = `
                    <input type="text" placeholder="Scanhold" title="Scanhold Time" readonly>
                    <ul class="options open-top" style="position: absolute; display: none; bottom: 100%; margin-bottom: 5px;">
                        <li data-value="1" class="option">1 sec.</li>
                        <li data-value="3" class="option">3 sec.</li>
                        <li data-value="5" class="option">5 sec.</li>
                        <li data-value="7" class="option">7 sec.</li>
                        <li data-value="10" class="option">10 sec.</li>
                        <li data-value="20" class="option">20 sec.</li>
                        <li data-value="30" class="option">30 sec.</li>
                    </ul>
                `;
            } else {
                delayContainer.innerHTML = `
                    <input type="text" placeholder="${delayValue} sec." title="Scanhold Time" readonly>
                    <ul class="options open-top" style="position: absolute; display: none; bottom: 100%; margin-bottom: 5px;">
                        <li data-value="1" class="option">1 sec.</li>
                        <li data-value="3" class="option">3 sec.</li>
                        <li data-value="5" class="option">5 sec.</li>
                        <li data-value="7" class="option">7 sec.</li>
                        <li data-value="10" class="option">10 sec.</li>
                        <li data-value="15" class="option">15 sec.</li>
                        <li data-value="20" class="option">20 sec.</li>
                        <li data-value="30" class="option">30 sec.</li>
                    </ul>
                `;
            }

            let blacklistArray = blacklist; 
            let whitelistArray = whitelist; 

            if (!Autoscan_PE5PVB_Mode) {
                if (blacklistArray.length !== 0 || whitelistArray.length !== 0 ) {
                    modeContainer.style.display = 'block';
                    scannerControls.appendChild(modeContainer);
                    initializeDropdown(modeContainer, 'Selected Mode:', 'M');
                }
            }

            scannerControls.appendChild(sensitivityContainer);
            initializeDropdown(sensitivityContainer, 'Selected Sensitivity:', 'I');
            scannerControls.appendChild(delayContainer);
            initializeDropdown(delayContainer, 'Selected Delay:', 'K');

            // Replace volume slider with flex container with scanner controls
            const volumeSliderParent = document.getElementById('volumeSlider').parentNode;
            volumeSliderParent.style.display = 'none'; // Hide volume slider
            volumeSliderParent.parentNode.insertBefore(scannerControls, volumeSliderParent.nextSibling);
        }

        function initializeDropdown(container, logPrefix, commandPrefix) {
            const input = container.querySelector('input');
            const options = container.querySelectorAll('.option');
            const dropdown = container.querySelector('.options');

            input.addEventListener('click', () => {
                const isOpen = dropdown.style.display === 'block';
                closeAllDropdowns(); // Close all other dropdowns
                dropdown.style.display = isOpen ? 'none' : 'block';
            });

            options.forEach(option => {
                option.addEventListener('click', () => {
                    const value = option.getAttribute('data-value');
                    input.value = option.textContent.trim();
                    input.setAttribute('data-value', value); // Set the data-value attribute
                    dropdown.style.display = 'none'; // Close the dropdown after selection

                    // Save the selected value
                    if (commandPrefix === 'I') {
                        sensitivityValue = value;
                    }
                    if (commandPrefix === 'K') {
                        delayValue = value;
                    }
                    if (commandPrefix === 'M') {
                        modeValue = value;
                    }

                    if (Autoscan_PE5PVB_Mode) {        
                        sendCommandToClient(`${commandPrefix}${value}`);
                    }
                });
            });

            document.addEventListener('click', (event) => {
                if (!container.contains(event.target)) {
                    dropdown.style.display = 'none';
                }
            });

            // Restore saved value if present
            if (commandPrefix === 'I' && sensitivityValue) {
                const savedOption = [...options].find(opt => opt.getAttribute('data-value') === sensitivityValue);
                if (savedOption) {
                    input.value = savedOption.textContent.trim();
                    input.setAttribute('data-value', sensitivityValue); // Set the data-value attribute
                }
            } else if (commandPrefix === 'K' && delayValue) {
                const savedOption = [...options].find(opt => opt.getAttribute('data-value') === delayValue);
                if (savedOption) {
                    input.value = savedOption.textContent.trim();
                    input.setAttribute('data-value', delayValue); // Set the data-value attribute
                }
            } else if (commandPrefix === 'M' && modeValue) {
                const savedOption = [...options].find(opt => opt.getAttribute('data-value') === modeValue);
                if (savedOption) {
                    input.value = savedOption.textContent.trim();
                    input.setAttribute('data-value', modeValue); // Set the data-value attribute
                }
            }
        }

        function closeAllDropdowns() {
            const allDropdowns = document.querySelectorAll('.scanner-dropdown .options');
            allDropdowns.forEach(dropdown => {
                dropdown.style.display = 'none';
            });
        }

		function saveDropdownValues() {
			const modeInput = document.querySelector('#scanner-controls .dropdown:nth-child(1) input');
			const sensitivityInput = document.querySelector('#scanner-controls .dropdown:nth-child(2) input');
			const delayInput = document.querySelector('#scanner-controls .dropdown:nth-child(3) input');

			if (modeInput) {
				modeValue = modeInput.getAttribute('data-value') || modeValue;
			} else {
				modeValue = defaultScannerMode;
			}
			if (sensitivityInput) {
				sensitivityValue = sensitivityInput.getAttribute('data-value') || sensitivityValue;
			} else {
				sensitivityValue = defaultSensitivityValue;
			}
			if (delayInput) {
				delayValue = delayInput.getAttribute('data-value') || delayValue;
			} else {
				delayValue = defaultScanHoldTime / 1000;
			}
		}

		document.addEventListener('DOMContentLoaded', function() {
			checkAdminMode();
		});

		var isTuneAuthenticated = false; // Set global variable initially to false

		function checkAdminMode() {
			var bodyText = document.body.textContent || document.body.innerText;
			var isAdminLoggedIn = bodyText.includes("You are logged in as an adminstrator.");
			var canControlReceiver = bodyText.includes("You are logged in and can control the receiver.");

			if (isAdminLoggedIn || canControlReceiver) {
				console.log("Admin or Tune mode found. Scanner Plugin Authentication successful.");
				isTuneAuthenticated = true;
			} else {
				console.log("No special authentication message found. Authentication failed.");
				isTuneAuthenticated = false;
			}
		}
    })();
})();
