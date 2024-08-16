///////////////////////////////////////////////////////////////
///                                                         ///
///  SCANNER CLIENT SCRIPT FOR FM-DX-WEBSERVER (V2.0 BETA)  /// 
///                                                         ///
///                                  last update: 16.08.24  ///
///                                                         /// 
///  by Highpoint                                           ///
///  powered by PE5PVB                                      ///     
///                                                         ///
///  https://github.com/Highpoint2000/webserver-scanner     ///
///                                                         ///
///////////////////////////////////////////////////////////////

///  This plugin only works with web server version 1.2.6!!!

///////////////////////////////////////////////////////////////

(() => {

    const pluginVersion = 'V2.0 BETA'; 
    const currentURL = new URL(window.location.href);
    const WebserverURL = currentURL.hostname;
    const WebserverPath = currentURL.pathname.replace(/setup/g, '');
    const WebserverPORT = currentURL.port || (currentURL.protocol === 'https:' ? '443' : '80');
    const protocol = currentURL.protocol === 'https:' ? 'wss:' : 'ws:';
    const WEBSOCKET_URL = `${protocol}//${WebserverURL}:${WebserverPORT}${WebserverPath}extra`;
    const ipApiUrl = 'https://api.ipify.org?format=json';
    const target = '127.0.0.1';

    let wsSendSocket;
    let clientIp = '';
    let signalValue = 'dBf';
    let isTuneAuthenticated = false; // Initially set to false
    let scannerButtonsExecuted = false; // Tracks if ScannerButtons have been executed
	let Scan = 'off';

    // Create a status message object
    function createMessage(status, Scan = '', Search = '', Sensitivity = '', ScannerMode = '', ScanHoldTime = '') {
        return {
            type: 'Scanner',
            value: {
                status,
                Scan,
                Search,     
                Sensitivity,
                ScannerMode,
                ScanHoldTime
            },
            source: clientIp,
            target: target
        };
    }

    // Send an initial message when the WebSocket is connected
    async function sendInitialWebSocketMessage() {
        try {
            const response = await fetch(ipApiUrl);
            const data = await response.json();
            clientIp = data.ip; // Assign client IP
            const initialMessage = createMessage('request');
            if (wsSendSocket && wsSendSocket.readyState === WebSocket.OPEN) {
                wsSendSocket.send(JSON.stringify(initialMessage));
                console.log("Scanner sent initial message sent:", initialMessage);
            } else {
                console.error("Scanner Error! WebSocket is not open. Cannot send initial message.");
				showCustomAlert('Scanner Error! WebSocket is not open. Cannot send initial message');
            }
        } catch (error) {
            console.error(error);
        }
    }

    // Send a search request
    async function sendSearch(SearchFunction) {
        try {
            const searchMessage = createMessage('send', '', SearchFunction);
            if (wsSendSocket && wsSendSocket.readyState === WebSocket.OPEN) {
                wsSendSocket.send(JSON.stringify(searchMessage));
                console.log("Search message sent:", searchMessage);
            } else {
                console.error("Scanner Error! WebSocket is not open. Cannot send search message.");
				showCustomAlert('Scanner Error! WebSocket is not open. Cannot send search message');
            }
        } catch (error) {
            console.error(error);
        }
    }

    // Send a scan request
    async function sendScan(ScanFunction) {
        try {
            const scanMessage = createMessage('send', ScanFunction);
            if (wsSendSocket && wsSendSocket.readyState === WebSocket.OPEN) {
                wsSendSocket.send(JSON.stringify(scanMessage));
                console.log("Scanner sent message:", scanMessage);
            } else {
                console.error("Scanner Error! WebSocket is not open. Cannot send scan message.");
				showCustomAlert('Scanner Error! WebSocket is not open. Cannot send scan message');
            }
        } catch (error) {
            console.error(error);
        }
    }

    // Send values for sensitivity, scanner mode, and scan hold time
    async function SendValue(Sensitivity, ScannerMode, ScanHoldTime) {
        try {
            const valueMessage = createMessage('send', '', '', Sensitivity, ScannerMode, ScanHoldTime);
            if (wsSendSocket && wsSendSocket.readyState === WebSocket.OPEN) {
                wsSendSocket.send(JSON.stringify(valueMessage));
                console.log("Value message sent:", valueMessage);
            } else {
                console.error("Scanner Error! WebSocket is not open. Cannot send value message.");
				showCustomAlert('Scanner Error! WebSocket is not open. Cannot send value message');
            }
        } catch (error) {
            console.error(error);
        }
    }

    // Setup WebSocket connection
    async function setupSendSocket() {
        if (!wsSendSocket || wsSendSocket.readyState === WebSocket.CLOSED) {
            try {
                wsSendSocket = new WebSocket(WEBSOCKET_URL);
                wsSendSocket.onopen = () => {
                    console.log("Scanner connected WebSocket");
                    sendInitialWebSocketMessage();
                };
                wsSendSocket.onmessage = handleWebSocketMessage;
                wsSendSocket.onerror = (error) => {
					console.error("Scanner Websocket Error:", error);
					showCustomAlert('Scanner Websocket Error!');
				};
                wsSendSocket.onclose = (event) => {
                    console.log("Scanner Error! Websocket closed or not open:", event);
					showCustomAlert('Scanner Error! Websocket closed or not open');
                    setTimeout(setupSendSocket, 5000); // Reconnect after 5 seconds
                };
            } catch (error) {
                console.error("Failed to setup Send WebSocket:", error);
				showCustomAlert('Scanner Error! Failed to setup Send WebSocket');
                setTimeout(setupSendSocket, 5000);
            }
        }
    }

    // Handle incoming WebSocket messages
    function handleWebSocketMessage(event) {
        try {
            const eventData = JSON.parse(event.data);
			// console.log(eventData);
			
            if (eventData.type === 'Scanner' && eventData.source !== clientIp) {
                const { status, ScanPE5PVB, SearchPE5PVB, Scan, Sensitivity, ScannerMode, ScanHoldTime } = eventData.value;
				console.log(eventData);		
				
                if (status === 'response' && eventData.target === clientIp) {

                    if (!scannerButtonsExecuted) {
                        ScannerButtons(Sensitivity, ScannerMode, ScanHoldTime, ScanPE5PVB);
                        SearchButtons();
                        scannerButtonsExecuted = true; // Mark as executed
			
						if (isTuneAuthenticated) {
							if (ScanPE5PVB) {
								showCustomAlert(`Scanner settings activated ! PE5PVB Scan: ${ScanPE5PVB} | PE5PVB Search: ${SearchPE5PVB} | Autoscan: ${Scan} | Sensitivity: ${Sensitivity} | Scanmode: ${ScannerMode} | Scanholdtime: ${ScanHoldTime}`); 
							} else {
								showCustomAlert(`Scanner settings activated ! PE5PVB Scan: ${ScanPE5PVB} | PE5PVB Search: ${SearchPE5PVB} | Autoscan: ${Scan} | Sensitivity: ${Sensitivity} | Scanholdtime: ${ScanHoldTime}`); 
							}
						}
                    }
					
					updateDropdownValues(Sensitivity, ScannerMode, ScanHoldTime);
					                  
                } else if (status === 'broadcast') {
                    updateDropdownValues(Sensitivity, ScannerMode, ScanHoldTime);
                    // console.log(eventData);
                }

                // Handle Scan button state
                const ScanButton = document.getElementById('Scan-on-off');
                const blinkTextElement = document.querySelector('#tune-buttons .blink');
                if (ScanButton) {
					if (Scan === 'off') {
						
                        ScanButton.setAttribute('data-scan-status', 'off');
                        ScanButton.classList.remove('bg-color-4');
                        ScanButton.classList.add('bg-color-3');

                        // Show frequency and search buttons
                        document.getElementById('freq-down').style.display = 'block';
                        document.getElementById('freq-up').style.display = 'block';
                        document.getElementById('search-down').style.display = 'block';
                        document.getElementById('search-up').style.display = 'block';
                        document.getElementById('commandinput').style.display = 'block';

                        // Hide the blink text
                        if (blinkTextElement) {
                            blinkTextElement.style.display = 'none';
                        }
						
                    } else {
						
                        ScanButton.setAttribute('data-scan-status', 'on');
                        ScanButton.classList.remove('bg-color-3');
                        ScanButton.classList.add('bg-color-4');

                        // Hide frequency and search buttons
                        document.getElementById('freq-down').style.display = 'none';
                        document.getElementById('freq-up').style.display = 'none';
                        document.getElementById('search-down').style.display = 'none';
                        document.getElementById('search-up').style.display = 'none';
                        document.getElementById('commandinput').style.display = 'none';

                        // Show the blink text
                        if (blinkTextElement) {
                            blinkTextElement.style.display = 'block';
                        }

                    }
					

                }
            }
        } catch (error) {
            console.error("Error handling WebSocket message:", error);
        }
    }

    // Update dropdown values for sensitivity, scanner mode, and scan hold time
    function updateDropdownValues(Sensitivity, ScannerMode, ScanHoldTime) {
        // Update Sensitivity dropdown value
        if (Sensitivity) {
            const sensitivityInput = document.querySelector('input[title="Scanner Sensitivity"]');
            if (sensitivityInput) {
                sensitivityInput.value = `${Sensitivity} dBf`;
            }
        }

        // Update Scanner Mode dropdown value
        if (ScannerMode) {
            const modeInput = document.querySelector('input[title="Scanner Mode"]');
            if (modeInput) {
                modeInput.value = `${ScannerMode}`;
            }
        }

        // Update Scan Hold Time dropdown value
        if (ScanHoldTime) {
            const holdTimeInput = document.querySelector('input[title="Scanhold Time"]');
            if (holdTimeInput) {
                holdTimeInput.value = `${ScanHoldTime} sec.`;
            }
        }
    }

    // Create search buttons
    function SearchButtons() {
        const searchDownButton = document.createElement('button');
        searchDownButton.id = 'search-down';
        searchDownButton.setAttribute('aria-label', 'Scan Down');
        searchDownButton.classList.add('rectangular-downbutton');
        searchDownButton.innerHTML = '<i class="fa-solid fa-chevron-left"></i><i class="fa-solid fa-chevron-left"></i>';

        const searchUpButton = document.createElement('button');
        searchUpButton.id = 'search-up';
        searchUpButton.setAttribute('aria-label', 'Scan Up');
        searchUpButton.classList.add('rectangular-upbutton');
        searchUpButton.innerHTML = '<i class="fa-solid fa-chevron-right"></i><i class="fa-solid fa-chevron-right"></i>';

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
        freqDownButton.parentNode.insertBefore(searchDownButton, freqDownButton.nextSibling);

        const freqUpButton = document.getElementById('freq-up');
        freqUpButton.parentNode.insertBefore(searchUpButton, freqUpButton);

        searchDownButton.addEventListener('click', function () {
            sendSearch('down');
        });

        searchUpButton.addEventListener('click', function () {
            sendSearch('up');
        });
    }

function BlinkAutoScan() {
    const element = document.getElementById('tune-buttons');

    if (element) {
        element.classList.remove('no-bg');

        const blinkText = document.createElement('span');
        blinkText.textContent = 'Autoscan active!';

        blinkText.classList.add('blink');
        blinkText.style.display = 'none'; // Initially hide the element

        // Append the blinkText element to the parent element
        element.appendChild(blinkText);

        // Add styles for blinking effect
        const style = document.createElement('style');
        style.textContent = `
            #tune-buttons {
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100%;
            }

            .blink {
                font-size: 32px;
                font-weight: bold;
                font-family: Titillium Web, Calibri, sans-serif;
                color: red;
                animation: blink-animation 1s step-start 0s infinite;
            }

            @keyframes blink-animation {
                50% {
                    opacity: 0;
                }
            }
        `;

        document.head.appendChild(style);
    }
}


// Helper functions to manage cookies
function setCookie(name, value, days) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = name + '=' + encodeURIComponent(value) + '; expires=' + expires + '; path=/';
}

function getCookie(name) {
    return document.cookie.split('; ').reduce((r, v) => {
        const parts = v.split('=');
        return parts[0] === name ? decodeURIComponent(parts[1]) : r;
    }, '');
}

function eraseCookie(name) {
    setCookie(name, '', -1);
}

// Create scanner control buttons
function ScannerButtons(Sensitivity, ScannerMode, ScanHoldTime, ScanPE5PVB) {
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

    const muteButton = document.querySelector('button[aria-label="Mute"]');
    if (muteButton) {
        ScannerButton.style.width = 'calc(100% - 1px)';
        ScannerButton.style.marginLeft = '-1px';
    } else {
        ScannerButton.style.width = 'calc(100% - 2px)';
        ScannerButton.style.marginLeft = '0px';
    }

    const buttonEq = document.querySelector('.button-eq');
    const buttonIms = document.querySelector('.button-ims');

    const newDiv = document.createElement('div');
    newDiv.className = "hide-phone panel-50 no-bg h-100 m-0";
    newDiv.appendChild(ScannerButton);

    buttonEq.parentNode.insertBefore(newDiv, buttonIms);

    let pressTimer;
    let isLongPress = false;

    // Toggle the scan mode based on press duration
    function toggleScan(isLongPressAction) {
        const ScanButton = document.getElementById('Scan-on-off');
        const isScanOn = ScanButton.getAttribute('data-scan-status') === 'on';

        if (isLongPressAction) {
            if (isTuneAuthenticated) {
                const scannerControls = document.getElementById('scanner-controls');
                if (scannerControls) {
                    scannerControls.parentNode.removeChild(scannerControls);
                    const volumeSliderParent = document.getElementById('volumeSlider').parentNode;
                    volumeSliderParent.style.display = 'block';
                    setCookie('scannerControlsStatus', 'off', 7); // Remember the status
                } else {
                    createScannerControls(Sensitivity, ScannerMode, ScanHoldTime, ScanPE5PVB);
                    setCookie('scannerControlsStatus', 'on', 7); // Remember the status
                }
            } else {
                showCustomAlert("Admin must be logged in to use the autoscan mode!");
            }
        } else {
            if (isTuneAuthenticated) {
                if (isScanOn) {
                    sendScan('off');
                    setCookie('scannerControlsStatus', 'off', 7); // Remember the status
                } else {
                    sendScan('on');
                    setCookie('scannerControlsStatus', 'on', 7); // Remember the status
                }
            } else {
                showCustomAlert("Admin must be logged in to use the autoscan mode!");
            }
        }
    }

    // Start a timer for detecting long presses
    function startPressTimer() {
        isLongPress = false;
        pressTimer = setTimeout(() => {
            isLongPress = true;
            toggleScan(true); // Trigger long press action
        }, 1000); // 1 second
    }

    // Cancel the press timer
    function cancelPressTimer() {
        clearTimeout(pressTimer);
        if (!isLongPress) {
            toggleScan(false); // Trigger short press action
        }
    }

    const ScanButton = document.getElementById('Scan-on-off');
    ScanButton.addEventListener('mousedown', startPressTimer);
    ScanButton.addEventListener('mouseup', cancelPressTimer);

    // Initialize scannerControls based on cookie
    const scannerControlsStatus = getCookie('scannerControlsStatus');
    if (scannerControlsStatus === 'on' && isTuneAuthenticated) {
        createScannerControls(Sensitivity, ScannerMode, ScanHoldTime, ScanPE5PVB);
    } else {
        const scannerControls = document.getElementById('scanner-controls');
        if (scannerControls) {
            scannerControls.parentNode.removeChild(scannerControls);
        }
    }
}


    // Function to check and update the signal unit values
    function checkSignalUnits() {
        const signalElement = document.querySelector('span.signal-units.text-medium');
        if (signalElement) {
            signalValue = signalElement.textContent.trim();
        } else {
            console.warn('The signalValue element was not found.');
        }
    }

    setInterval(checkSignalUnits, 1000);

    // Create the scanner controls interface
    function createScannerControls(Sensitivity, ScannerMode, ScanHoldTime, ScanPE5PVB) {
        const scannerControls = document.createElement('div');
        scannerControls.className = "no-bg h-100";
        scannerControls.id = "scanner-controls";
        scannerControls.style.width = '100%';
        scannerControls.style.display = 'flex';
        scannerControls.style.justifyContent = 'space-between';
        scannerControls.style.marginTop = "0px";
        scannerControls.style.marginRight = "10px";
        scannerControls.style.position = 'relative'; // Ensure it's on top

        const sensitivityContainer = document.createElement('div');
        sensitivityContainer.className = "dropdown";
        sensitivityContainer.style.marginRight = "1px";
        sensitivityContainer.style.marginLeft = "0px";
        sensitivityContainer.style.width = "100%";
        sensitivityContainer.style.height = "99%";
        sensitivityContainer.style.position = 'relative'; // Ensure it's on top
        sensitivityContainer.style.borderTopLeftRadius = '15px';
        sensitivityContainer.style.borderBottomLeftRadius = '15px';

        const modeContainer = document.createElement('div');
        modeContainer.className = "dropdown";
        modeContainer.style.marginRight = "1px";
        modeContainer.style.marginLeft = "0px";
        modeContainer.style.width = "100%";
        modeContainer.style.height = "99%";
        modeContainer.style.position = 'relative'; // Ensure it's on top		
        modeContainer.innerHTML = `
            <input type="text" placeholder="${ScannerMode}" title="Scanner Mode" readonly>
            <ul class="options open-top" style="position: absolute; display: none; bottom: 100%; margin-bottom: 5px;">
                <li data-value="normal" class="option">normal</li>
                <li data-value="blacklist" class="option">blacklist</li>
                <li data-value="whitelist" class="option">whitelist</li>
            </ul>
        `;

        const delayContainer = document.createElement('div');
        delayContainer.className = "dropdown";
        delayContainer.style.marginLeft = "0px";	
        delayContainer.style.width = "100%";
        delayContainer.style.height = "99%";
        delayContainer.style.position = 'relative'; // Ensure it's on top
        delayContainer.style.borderTopRightRadius = '15px';
        delayContainer.style.borderBottomRightRadius = '15px';

        const VolumeSlider = document.getElementById('volumeSlider');
        const VolumeSliderWidth = VolumeSlider.clientWidth; // Get the width of the volume slider

        if (VolumeSliderWidth > 300) {
            delayContainer.style.marginRight = "-10px";
        } else {
            delayContainer.style.marginRight = "5px";
        }

        if (signalValue === 'dBf') {		
            sensitivityContainer.innerHTML = `
                <input type="text" placeholder="${Sensitivity} dBf" title="Scanner Sensitivity" readonly>
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
        } else if (signalValue === 'dBµV') {		
            sensitivityContainer.innerHTML = `
                <input type="text" placeholder="${Sensitivity} dBµV" title="Scanner Sensitivity" readonly>
                <ul class="options open-top" style="position: absolute; display: none; bottom: 100%; margin-bottom: 5px;">
                    <li data-value="5" class="option">5 dBµV</li>
                    <li data-value="10" class="option">10 dBµV</li>
                    <li data-value="15" class="option">15 dBµV</li>
                    <li data-value="20" class="option">20 dBµV</li>
                    <li data-value="25" class="option">25 dBµV</li>
                    <li data-value="30" class="option">30 dBµV</li>
                    <li data-value="35" class="option">35 dBµV</li>
                    <li data-value="40" class="option">40 dBµV</li>
                    <li data-value="45" class="option">45 dBµV</li>
                    <li data-value="50" class="option">50 dBµV</li>
                    <li data-value="55" class="option">55 dBµV</li>
                    <li data-value="60" class="option">60 dBµV</li>
                </ul>
            `;
        } else if (signalValue === 'dBm') {		
            sensitivityContainer.innerHTML = `
                <input type="text" placeholder="${Sensitivity} dBm" title="Scanner Sensitivity" readonly>
                <ul class="options open-top" style="position: absolute; display: none; bottom: 100%; margin-bottom: 5px;">
                    <li data-value="-115" class="option">-115 dBm</li>
                    <li data-value="-110" class="option">-110 dBm</li>
                    <li data-value="-105" class="option">-105 dBm</li>
                    <li data-value="-100" class="option">-100 dBm</li>
                    <li data-value="-95" class="option">-95 dBm</li>
                    <li data-value="-90" class="option">-90 dBm</li>
                    <li data-value="-85" class="option">-85 dBm</li>
                    <li data-value="-80" class="option">-80 dBm</li>
                    <li data-value="-75" class="option">-75 dBm</li>
                    <li data-value="-70" class="option">-70 dBm</li>
                    <li data-value="-65" class="option">-65 dBm</li>
                    <li data-value="-60" class="option">-60 dBm</li>
                </ul>
            `;
        }

        delayContainer.innerHTML = `
            <input type="text" placeholder="${ScanHoldTime} sec." title="Scanhold Time" readonly>
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

        scannerControls.appendChild(sensitivityContainer);
        initializeDropdown(sensitivityContainer, 'Selected Sensitivity:', 'I', Sensitivity, '', '');

        if (!ScanPE5PVB) {
            modeContainer.style.display = 'block';
            scannerControls.appendChild(modeContainer);
            initializeDropdown(modeContainer, 'Selected Mode:', 'M', '', ScannerMode, '');
        }

        scannerControls.appendChild(delayContainer);
        initializeDropdown(delayContainer, 'Selected Delay:', 'K', '', '', ScanHoldTime);

        const volumeSliderParent = document.getElementById('volumeSlider').parentNode;
        volumeSliderParent.style.display = 'none'; // Hide volume slider
        volumeSliderParent.parentNode.insertBefore(scannerControls, volumeSliderParent.nextSibling);
    }

    // Initialize dropdown functionality
    function initializeDropdown(container, logPrefix, commandPrefix, Sensitivity, ScannerMode, ScanHoldTime) {
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

                if (commandPrefix === 'I') {
                    SendValue(value, ScannerMode, ScanHoldTime);
                }
                if (commandPrefix === 'M') {
                    SendValue(Sensitivity, value, ScanHoldTime); // Convert seconds to milliseconds
                }
                if (commandPrefix === 'K') {
                    SendValue(Sensitivity, ScannerMode, value);
                }
            });
        });

        document.addEventListener('click', (event) => {
            if (!container.contains(event.target)) {
                dropdown.style.display = 'none';
            }
        });
    }

    // Close all open dropdowns
    function closeAllDropdowns() {
        const allDropdowns = document.querySelectorAll('.scanner-dropdown .options');
        allDropdowns.forEach(dropdown => {
            dropdown.style.display = 'none';
        });
    }
	
	function showCustomAlert(message) {
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.padding = '15px 30px';
        notification.style.borderRadius = '8px';
        notification.style.zIndex = '1000';
        notification.style.opacity = '1';
        notification.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
        notification.style.fontSize = '16px';
        notification.style.fontWeight = 'bold';
        notification.style.textAlign = 'center';
        notification.style.color = '#fff';

        if (message.toLowerCase().includes('error')) {
            notification.style.backgroundColor = '#FF0000';
        } else if (message.toLowerCase().includes('!!!')) {
            notification.style.backgroundColor = '#008000';
        } else {
            notification.style.backgroundColor = '#333';
        }

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(-50%) translateY(-20px)';
            setTimeout(() => document.body.removeChild(notification), 500);
        }, 4000);
    }

    // Check for admin mode authentication
    function checkAdminMode() {
        const bodyText = document.body.textContent || document.body.innerText;
        const isAdminLoggedIn = bodyText.includes("You are logged in as an administrator.") || bodyText.includes("You are logged in as an adminstrator.");
        const canControlReceiver = bodyText.includes("You are logged in and can control the receiver.");

        if (isAdminLoggedIn || canControlReceiver) {
            console.log("Admin or Tune mode found. Scanner Plugin Authentication successful.");
            isTuneAuthenticated = true;
        } else {
            console.log("No special authentication message found. Authentication failed.");
            isTuneAuthenticated = false;
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
		BlinkAutoScan();
        checkAdminMode();
        setupSendSocket();
    });
})();
