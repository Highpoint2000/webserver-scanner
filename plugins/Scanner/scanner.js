(() => {
///////////////////////////////////////////////////////////////
///                                                         ///
///  SCANNER CLIENT SCRIPT FOR FM-DX-WEBSERVER (V3.8)      ///
///                                                         ///
///  by Highpoint               last update: 04.06.25       ///
///  powered by PE5PVB                                      ///
///                                                         ///
///  https://github.com/Highpoint2000/webserver-scanner     ///
///                                                         ///
///////////////////////////////////////////////////////////////

/////// compatible from webserver version 1.3.8 !!! ///////////

    const pluginSetupOnlyNotify = true;
	const CHECK_FOR_UPDATES = true;
	
///////////////////////////////////////////////////////////////

	const pluginVersion = '3.8';
	const pluginName = "Scanner";
	const pluginHomepageUrl = "https://github.com/Highpoint2000/webserver-scanner/releases";
	const pluginUpdateUrl = "https://raw.githubusercontent.com/Highpoint2000/webserver-scanner/refs/heads/main/plugins/Scanner/scanner.js";
	
	const EnableBlacklist = true; // This value is automatically updated via the config file
	const EnableWhitelist = true; // This value is automatically updated via the config file
	const EnableSpectrumScan = true; // This value is automatically updated via the config file
	const EnableSpectrumScanBL = true; // This value is automatically updated via the config file
	const EnableDifferenceScan = true; // This value is automatically updated via the config file
	const EnableDifferenceScanBL = true; // This value is automatically updated via the config file
    const currentURL = new URL(window.location.href);
    const WebserverURL = currentURL.hostname;
    const WebserverPath = currentURL.pathname.replace(/setup/g, '');
    const WebserverPORT = currentURL.port || (currentURL.protocol === 'https:' ? '443' : '80');
    const protocol = currentURL.protocol === 'https:' ? 'wss:' : 'ws:';
    const WEBSOCKET_URL = `${protocol}//${WebserverURL}:${WebserverPORT}${WebserverPath}data_plugins`;
    const ipApiUrl = 'https://api.ipify.org?format=json';
    const target = '127.0.0.1';

    let wsSendSocket;
    let clientIp = '';
    let signalValue = 'dBµV';
    let isTuneAuthenticated = false; // Initially set to false
    let scannerButtonsExecuted = false; // Tracks if ScannerButtons have been executed
    let Scan = 'off';
	let ScanPE5PVBstatus = '';
	let SpectrumLimiterValueStatus;
	let ScannerModeStatus;

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
                ScanHoldTime,
            },
            source: clientIp,
            target: target
        };
    }
	
// Function for update notification in /setup
function checkUpdate(setupOnly, pluginName, urlUpdateLink, urlFetchLink) {
    if (setupOnly && window.location.pathname !== '/setup') return;

    let pluginVersionCheck = typeof pluginVersion !== 'undefined' ? pluginVersion : typeof plugin_version !== 'undefined' ? plugin_version : typeof PLUGIN_VERSION !== 'undefined' ? PLUGIN_VERSION : 'Unknown';

    // Function to check for updates
    async function fetchFirstLine() {
        const urlCheckForUpdate = urlFetchLink;

        try {
            const response = await fetch(urlCheckForUpdate);
            if (!response.ok) {
                throw new Error(`[${pluginName}] update check HTTP error! status: ${response.status}`);
            }

            const text = await response.text();
            const lines = text.split('\n');

            let version;

            if (lines.length > 2) {
                const versionLine = lines.find(line => line.includes("const pluginVersion =") || line.includes("const plugin_version =") || line.includes("const PLUGIN_VERSION ="));
                if (versionLine) {
                    const match = versionLine.match(/const\s+(?:pluginVersion|plugin_version|PLUGIN_VERSION)\s*=\s*['"]([^'"]+)['"]/);
                    if (match) {
                        version = match[1];
                    }
                }
            }

            if (!version) {
                const firstLine = lines[0].trim();
                version = /^\d/.test(firstLine) ? firstLine : "Unknown"; // Check if first character is a number
            }

            return version;
        } catch (error) {
            console.error(`[${pluginName}] error fetching file:`, error);
            return null;
        }
    }

    // Check for updates
    fetchFirstLine().then(newVersion => {
        if (newVersion) {
            if (newVersion !== pluginVersionCheck) {
                let updateConsoleText = "There is a new version of this plugin available";
                // Any custom code here
                
                console.log(`[${pluginName}] ${updateConsoleText}`);
                setupNotify(pluginVersionCheck, newVersion, pluginName, urlUpdateLink);
            }
        }
    });

    function setupNotify(pluginVersionCheck, newVersion, pluginName, urlUpdateLink) {
        if (window.location.pathname === '/setup') {
          const pluginSettings = document.getElementById('plugin-settings');
          if (pluginSettings) {
            const currentText = pluginSettings.textContent.trim();
            const newText = `<a href="${urlUpdateLink}" target="_blank">[${pluginName}] Update available: ${pluginVersionCheck} --> ${newVersion}</a><br>`;

            if (currentText === 'No plugin settings are available.') {
              pluginSettings.innerHTML = newText;
            } else {
              pluginSettings.innerHTML += ' ' + newText;
            }
          }

          const updateIcon = document.querySelector('.wrapper-outer #navigation .sidenav-content .fa-puzzle-piece') || document.querySelector('.wrapper-outer .sidenav-content') || document.querySelector('.sidenav-content');

          const redDot = document.createElement('span');
          redDot.style.display = 'block';
          redDot.style.width = '12px';
          redDot.style.height = '12px';
          redDot.style.borderRadius = '50%';
          redDot.style.backgroundColor = '#FE0830' || 'var(--color-main-bright)'; // Theme colour set here as placeholder only
          redDot.style.marginLeft = '82px';
          redDot.style.marginTop = '-12px';

          updateIcon.appendChild(redDot);
        }
    }
}

if (CHECK_FOR_UPDATES) checkUpdate(pluginSetupOnlyNotify, pluginName, pluginHomepageUrl, pluginUpdateUrl);

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
				sendToast('error important', 'Scanner', 'WebSocket is not open. Cannot send initial message.', false, false);
            }
        } catch (error) {
            console.error(error);
        }
    }

    // Send a search request
    async function sendSearch(SearchFunction) {

        try {
            const searchMessage = createMessage('command', '', SearchFunction);
            if (wsSendSocket && wsSendSocket.readyState === WebSocket.OPEN) {
                wsSendSocket.send(JSON.stringify(searchMessage));
                console.log("Search message sent:", searchMessage);
            } else {
                console.error("Scanner Error! WebSocket is not open. Cannot send search message.");
				sendToast('error important', 'Scanner', 'WebSocket is not open. Cannot send value message.', false, false);
            }
        } catch (error) {
            console.error(error);
		}
    }

    // Send a scan request
    async function sendScan(ScanFunction) {

        try {
            const scanMessage = createMessage('command', ScanFunction);
            if (wsSendSocket && wsSendSocket.readyState === WebSocket.OPEN) {
                wsSendSocket.send(JSON.stringify(scanMessage));
                console.log("Scanner sent message:", scanMessage);
            } else {
                console.error("Scanner Error! WebSocket is not open. Cannot send scan message.");
				sendToast('error important', 'Scanner', 'WebSocket is not open. Cannot send value message.', false, false);
            }
        } catch (error) {
            console.error(error);
        }
    }

    // Send values for sensitivity, scanner mode, and scan hold time
    async function SendValue(Sensitivity, ScannerMode, ScanHoldTime) {

        try {
            const valueMessage = createMessage('command', '', '', Sensitivity, ScannerMode, ScanHoldTime);
            if (wsSendSocket && wsSendSocket.readyState === WebSocket.OPEN) {
                wsSendSocket.send(JSON.stringify(valueMessage));
                console.log("Value message sent:", valueMessage);
            } else {
                console.error("Scanner Error! WebSocket is not open. Cannot send value message.");
				sendToast('error important', 'Scanner', 'WebSocket is not open. Cannot send value message.', false, false);
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
					sendToast('error important', 'Scanner', 'Websocket Error', false, false);
                };
                wsSendSocket.onclose = (event) => {
                    console.log("Scanner Error! Websocket closed or not open:", event);
					// sendToast('error important', 'Scanner', 'Websocket closed or not open', false, false);
                    setTimeout(setupSendSocket, 5000); // Reconnect after 5 seconds
                };
            } catch (error) {
                console.error("Failed to setup Send WebSocket:", error);
				sendToast('error important', 'Scanner', 'Failed to setup Send WebSocket', false, false);
                setTimeout(setupSendSocket, 5000);
            }
        }
    }

let lastToastTime = 0; // Variable to store the timestamp of the last toast

function handleWebSocketMessage(event) {
    try {
        const eventData = JSON.parse(event.data);
        // console.log(event.data);
    
        if (eventData.source !== clientIp) {
            // Uncomment the line below to log event data from other sources
            // console.log(eventData);
        }

        if (eventData.type === 'Scanner') {
            const {
                status,
                ScanPE5PVB,
                SearchPE5PVB,
                Scan,
                Sensitivity,
                ScannerMode,
                ScanHoldTime,
                SpectrumLimiterValue,
                StatusFMLIST,
                InfoFMLIST
            } = eventData.value;
                
            console.log(eventData.value);

            if (typeof ScanPE5PVB !== 'undefined') {
                ScanPE5PVBstatus = ScanPE5PVB;
            }

            if (status === 'response' && eventData.target === clientIp) {
                if (!scannerButtonsExecuted) {
                    ScannerButtons(Sensitivity, ScannerMode, ScanHoldTime);
                    SearchButtons();
                    scannerButtonsExecuted = true; // Mark as executed

                    if (isTuneAuthenticated) {
                        if (
                            ScannerMode === 'spectrum' ||
                            ScannerMode === 'spectrumBL' ||
                            ScannerMode === 'difference' ||
                            ScannerMode === 'differenceBL'
                        ) {
                            sendToastWithCooldown(
                                'info',
                                'Scanner',
                                `Settings activated! PE5PVB Scan: ${ScanPE5PVB} | PE5PVB Search: ${SearchPE5PVB} | Autoscan: ${Scan} | Sensitivity: ${Sensitivity} | Limit: ${SpectrumLimiterValue} | Scanmode: ${ScannerMode} | Scanholdtime: ${ScanHoldTime}`,
                                false,
                                false
                            );
                            if (SpectrumLimiterValue !== 'undefined' && SpectrumLimiterValue !== '') {
                                SpectrumLimiterValueStatus = SpectrumLimiterValue;
                                ScannerModeStatus = `${ScannerMode}`;
                            }
                        } else {
                            sendToastWithCooldown(
                                'info',
                                'Scanner',
                                `Settings activated! PE5PVB Scan: ${ScanPE5PVB} | PE5PVB Search: ${SearchPE5PVB} | Autoscan: ${Scan} | Sensitivity: ${Sensitivity} | Scanmode: ${ScannerMode} | Scanholdtime: ${ScanHoldTime}`,
                                false,
                                false
                            );
                        }
                    }
                }

                updateDropdownValues(Sensitivity, ScannerMode, ScanHoldTime);
            } else if (
                status === 'broadcast' &&
                InfoFMLIST !== '' &&
                InfoFMLIST !== undefined &&
                InfoFMLIST.includes("successful")
            ) {
                sendToastWithCooldown('success important', 'Scanner', `${InfoFMLIST}`, false, false);
                sendInitialWebSocketMessage(); // Restore Spectrum Graph ctx after FMLIST autolog
            } else if (
                status === 'broadcast' &&
                InfoFMLIST !== '' &&
                InfoFMLIST !== undefined &&
                InfoFMLIST.includes("failed")
            ) {
                sendToastWithCooldown('error important', 'Scanner', `${InfoFMLIST}`, false, false);
                sendInitialWebSocketMessage(); // Restore Spectrum Graph ctx after FMLIST autolog
            } else if (status === 'broadcast' || status === 'send') {
                updateDropdownValues(Sensitivity, ScannerMode, ScanHoldTime);
            }

            // Handle Scan button state
            const ScanButton = document.getElementById('Scan-on-off');
            const blinkTextElement = document.querySelector('#tune-buttons .autoscan-blink');
            const scannerControls = document.getElementById('scanner-controls');
            const HideElement = document.querySelector('.panel-33.hide-phone.no-bg');
            const volumeSliderParent = document.getElementById('volumeSlider')?.parentNode;

            if (ScanButton) {
                if (Scan === 'off') {
                    const element = document.getElementById('log-fmlist');
                    if (element) {
                        element.style.display = 'block';
                    }

                    ScanButton.setAttribute('data-scan-status', 'off');
                    ScanButton.classList.add('bg-color-3');
                    ScanButton.classList.remove('bg-color-4');

                    const freqDownElement = document.getElementById('freq-down');
                    if (freqDownElement) {
                        freqDownElement.style.display = 'block';
                    }

                    const freqUpElement = document.getElementById('freq-up');
                    if (freqUpElement) {
                        freqUpElement.style.display = 'block';
                    }

                    const searchDownElement = document.getElementById('search-down');
                    if (searchDownElement) {
                        searchDownElement.style.display = 'block';
                    }

                    const searchUpElement = document.getElementById('search-up');
                    if (searchUpElement) {
                        searchUpElement.style.display = 'block';
                    }

                    const commandInputElement = document.getElementById('commandinput');
                    if (commandInputElement) {
                        commandInputElement.style.display = 'block';
                    }

                    if (blinkTextElement) {
                        blinkTextElement.style.display = 'none';
                    }

                    if (window.innerWidth < 769) {
                        if (volumeSliderParent) {
                            volumeSliderParent.style.display = 'none';
                        }
                        if (scannerControls) {
                            scannerControls.style.display = 'none';
                        }
                        if (HideElement) {
                            HideElement.classList.add('hide-phone');
                        }
                    }

                } else if (Scan === 'on') {
                    const element = document.getElementById('log-fmlist');
                    if (element) {
                        element.style.display = 'none';
                    }

                    ScanButton.setAttribute('data-scan-status', 'on');
                    ScanButton.classList.add('bg-color-4');
                    ScanButton.classList.remove('bg-color-3');

                    const freqDownElement = document.getElementById('freq-down');
                    if (freqDownElement) {
                        freqDownElement.style.display = 'none';
                    }

                    const freqUpElement = document.getElementById('freq-up');
                    if (freqUpElement) {
                        freqUpElement.style.display = 'none';
                    }

                    const searchDownElement = document.getElementById('search-down');
                    if (searchDownElement) {
                        searchDownElement.style.display = 'none';
                    }

                    const searchUpElement = document.getElementById('search-up');
                    if (searchUpElement) {
                        searchUpElement.style.display = 'none';
                    }

                    const commandInputElement = document.getElementById('commandinput');
                    if (commandInputElement) {
                        commandInputElement.style.display = 'none';
                    }

                    if (blinkTextElement) {
                        blinkTextElement.style.display = 'block';
                    }

                    if (window.innerWidth < 769) {
                        if (volumeSliderParent) {
                            volumeSliderParent.style.display = 'none';
                        }
                        if (scannerControls) {
                            scannerControls.style.display = 'flex';
                        }
                        if (HideElement) {
                            HideElement.classList.remove('hide-phone');
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error("Error handling WebSocket message:", error);
    }
}

// Function to handle toast notifications with cooldown to prevent multiple toasts in 150ms
function sendToastWithCooldown(type, title, message, autoClose = true, closeOnClick = true) {
    const currentTime = new Date().getTime();
    if (currentTime - lastToastTime < 150) {
        return; // Ignore the toast if it's within 150ms of the last one
    }
    lastToastTime = currentTime; // Update the timestamp of the last toast
    sendToast(type, title, message, autoClose, closeOnClick); // Show the toast
}



    // Update dropdown values for sensitivity, scanner mode, and scan hold time
    function updateDropdownValues(Sensitivity, ScannerMode, ScanHoldTime) {
        // Update Sensitivity dropdown value
        if (Sensitivity) {
            const sensitivityInput = document.querySelector('input[title="Scanner Sensitivity"]');
            if (sensitivityInput) {
				if (ScanPE5PVBstatus) {
					sensitivityInput.value = `${Sensitivity}`;
				} else {
					sensitivityInput.value = `${Sensitivity} dBf`;
				}
                sensitivityInput.setAttribute('data-value', Sensitivity);
            }
        }

        // Update Scanner Mode dropdown value
        if (ScannerMode) {
            const modeInput = document.querySelector('input[title="Scanner Mode"]');
            if (modeInput) {
                modeInput.value = `${ScannerMode}`;
                modeInput.setAttribute('data-value', ScannerMode);
            }
        }

        // Update Scan Hold Time dropdown value
        if (ScanHoldTime) {
            const holdTimeInput = document.querySelector('input[title="Scanhold Time"]');
            if (holdTimeInput) {
                holdTimeInput.value = `${ScanHoldTime} sec.`;
                holdTimeInput.setAttribute('data-value', ScanHoldTime);
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
    console.log('BlinkAutoScan started');
    
    const parentElement = document.getElementById('tune-buttons');
    if (parentElement) {
		parentElement.classList.remove('no-bg');
        // Ensure that the parent container serves as the positioning context
        parentElement.style.position = 'relative';
        
        // Create a container for the blinking text if it does not already exist
        let blinkContainer = parentElement.querySelector('.autoscan-blink-container');
        if (!blinkContainer) {
            blinkContainer = document.createElement('div');
            blinkContainer.className = 'autoscan-blink-container';
            // Position absolutely so it does not affect the layout flow
            blinkContainer.style.position = 'absolute';
            blinkContainer.style.top = '0';
            blinkContainer.style.left = '0';
            blinkContainer.style.width = '100%';
            blinkContainer.style.height = '100%';
            blinkContainer.style.pointerEvents = 'none';
            // Initially hide the container to avoid layout shifts
            blinkContainer.style.display = 'none';
            parentElement.appendChild(blinkContainer);
        }
    
        // Create the blinking text element
        const blinkText = document.createElement('span');
        blinkText.textContent = 'Autoscan active!';
        blinkText.classList.add('autoscan-blink');
        // The text is created as a block element
        blinkText.style.display = 'none';
        blinkContainer.appendChild(blinkText);
    
        // Add CSS styles for the blinking text
        const style = document.createElement('style');
        style.textContent = `
            .autoscan-blink {
                font-size: 32px;
                font-weight: bold;
                font-family: "Titillium Web", Calibri, sans-serif;
                color: red;
                animation: autoscan-blink-animation 1s step-start infinite;
            }
            @keyframes autoscan-blink-animation {
                50% { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    
        // Show the container after a short timeout (e.g., 100ms)
        setTimeout(() => {
            blinkContainer.style.display = 'block';
        }, 100); // Adjust the value as needed
    } else {
        console.warn('Element with the ID "tune-buttons" not found.');
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
    function ScannerButtons(Sensitivity, ScannerMode, ScanHoldTime) {
        const ScannerButton = document.createElement('button');
        // ScannerButton.classList.add('hide-phone');
        ScannerButton.id = 'Scan-on-off';
        ScannerButton.setAttribute('aria-label', 'Scan');
        // ScannerButton.setAttribute('data-tooltip', 'Auto Scan on/off');
        ScannerButton.setAttribute('data-scan-status', 'off');
        ScannerButton.style.borderRadius = '0px 0px 0px 0px';
        ScannerButton.style.position = 'relative';
        ScannerButton.style.top = '0px';

        if (Scan === 'off') { 
        ScannerButton.classList.add('bg-color-3');
        }
        ScannerButton.title = `Plugin Version ${pluginVersion}`;
		
		const spans = document.querySelectorAll('span.text-small.color-4');

		let hasSDR = false;
		spans.forEach(span => {
		if (span.textContent.trim() === 'SDR') {
			hasSDR = true;
		}
		});

		if (hasSDR) {
			ScannerButton.style.borderRadius = '15px';
			ScannerButton.style.width = '300%';
			ScannerButton.style.right = '100%';
		} else {
			ScannerButton.style.marginLeft = '1px';
			ScannerButton.style.marginRight = '1px';
			
			if (window.innerWidth < 769) {
				ScannerButton.style.width = '100%';
				ScannerButton.style.height = '48px';
				ScannerButton.innerHTML = '<strong>Autoscan</strong>';
				ScannerButton.style.borderRadius = '15px';
			} else if (window.innerWidth < 890) {
				ScannerButton.innerHTML = '<strong>Auto<br>Scan</strong>';
				ScannerButton.style.borderRadius = '0px';
				ScannerButton.style.width = (window.innerWidth % 2 !== 0) ? '97.0%' : '97.5%';
			} else if (window.innerWidth < 990) {
				ScannerButton.innerHTML = '<strong>Auto<br>Scan</strong>';
				ScannerButton.style.borderRadius = '0px';
				ScannerButton.style.width = (window.innerWidth % 2 !== 0) ? '97.4%' : '97.7%';
			} else if (window.innerWidth < 1180) {
				ScannerButton.innerHTML = '<strong>Auto<br>Scan</strong>';
				ScannerButton.style.borderRadius = '0px';
				ScannerButton.style.width = (window.innerWidth % 2 !== 0) ? '98.0%' : '98.5%';
			} else {
				ScannerButton.innerHTML = '<strong>Auto<br>Scan</strong>';
				ScannerButton.style.borderRadius = '0px';
				ScannerButton.style.width = (window.innerWidth % 2 !== 0) ? '98.0%' : '98.5%';
			}

			const el = document.getElementById('data-ant');
			if (el) {
				if (window.innerWidth < 769) {
					ScannerButton.style.width = '100%';
					ScannerButton.style.height = '48px';
					ScannerButton.innerHTML = '<strong>Autoscan</strong>';
					ScannerButton.style.borderRadius = '15px';
				} else if (window.innerWidth < 890) {
					ScannerButton.innerHTML = '<strong>Auto<br>Scan</strong>';
					ScannerButton.style.borderRadius = '0px';
					ScannerButton.style.width = (window.innerWidth % 2 !== 0) ? '96.5%' : '95.0%';
				} else if (window.innerWidth < 990) {
					ScannerButton.innerHTML = '<strong>Auto<br>Scan</strong>';
					ScannerButton.style.borderRadius = '0px';
					ScannerButton.style.width = (window.innerWidth % 2 !== 0) ? '97.4%' : '97.0%';
				} else if (window.innerWidth < 1180) {
					ScannerButton.innerHTML = '<strong>Auto<br>Scan</strong>';
					ScannerButton.style.borderRadius = '0px';
					ScannerButton.style.width = (window.innerWidth % 2 !== 0) ? '97.0%' : '97.4%';
				} else {
					ScannerButton.innerHTML = '<strong>Auto<br>Scan</strong>';
					ScannerButton.style.borderRadius = '0px';
					ScannerButton.style.width = (window.innerWidth % 2 !== 0) ? '98.0%' : '97.5%';
				}
			}
		}

        ScannerButton.addEventListener('click', function() {
            const isActive = ScannerButton.getAttribute('data-scan-status') === 'on';
            if (!isLongPress) {
				if (isActive) {
					ScannerButton.setAttribute('data-scan-status', 'off');
					ScannerButton.style.backgroundColor = 'var(--color-3)'; // Hintergrundfarbe für inaktiven Zustand
				} else {
					ScannerButton.setAttribute('data-scan-status', 'on');
					ScannerButton.style.backgroundColor = 'var(--color-4)'; // Hintergrundfarbe für aktiven Zustand
				}
			}
        });
      
		if (window.innerWidth < 769 && ScannerButton) {
			const popupContent = document.querySelector('.popup-content');
			if (popupContent) {
				// Find all <p> with class
				const allParagraphs = popupContent.querySelectorAll('p.flex-phone.flex-center');

				// Determine target section
				let targetP = null;

				allParagraphs.forEach(p => {
					const text = p.textContent.trim();
					if (text === 'Bandwidth & Antennas' && !targetP) {
						targetP = p;
					} else if (text === 'Filters' && !targetP) {
						// Only as a fallback if nothing has been found yet
						targetP = p;
					}
				});

				// Only insert if not already present
				if (targetP && !document.getElementById('scanner-button-wrapper')) {
					// New <p> with "Scanner"
					const scannerLabel = document.createElement('p');
					scannerLabel.className = 'flex-phone flex-center';
					scannerLabel.textContent = 'Scanner';

					// Container for the button
					const scannerContainer = document.createElement('div');
					scannerContainer.className = 'flex-container flex-phone flex-center';
					scannerContainer.id = 'scanner-button-wrapper';
					scannerContainer.style.marginBottom = '10px'; // Abstand nach unten

					scannerContainer.appendChild(ScannerButton);

					// Insert before target section (either Bandwidth or Filters)
					popupContent.insertBefore(scannerLabel, targetP);
					popupContent.insertBefore(scannerContainer, scannerLabel.nextSibling);
				}
			}
		} else {
			// Desktop behavior remains unchanged
			const buttonIms = document.querySelector('.button-ims');
			if (buttonIms && ScannerButton) {
				const newDiv = document.createElement('div');
				newDiv.className = 'panel-50 no-bg br-0 h-100 m-0';
				newDiv.id = 'ScannerButtonWrapper';
				newDiv.appendChild(ScannerButton);
				buttonIms.parentNode.insertBefore(newDiv, buttonIms);
			}
		}	

        let pressTimer;
        let isLongPress = false;

function toggleScan(isLongPressAction) {
    const ScanButton = document.getElementById('Scan-on-off');
    const isScanOn = ScanButton.getAttribute('data-scan-status') === 'on';
    const scannerControls = document.getElementById('scanner-controls');
    const volumeSliderParent = document.getElementById('volumeSlider').parentNode;

    // If long press action is triggered
    if (isLongPressAction) {
        if (isTuneAuthenticated) {
            const currentScanStatus = isScanOn;  // Store the current scan status

            // Check if the scanner controls are already present
            if (scannerControls) {
                scannerControls.parentNode.removeChild(scannerControls);
                volumeSliderParent.style.display = 'block';
                setCookie('scannerControlsStatus', 'off', 7); // Remember the status
            } else {
                createScannerControls(Sensitivity, ScannerMode, ScanHoldTime);
                setCookie('scannerControlsStatus', 'on', 7); // Remember the status
            }

            // Restore the original scan status after the long press action
            if (currentScanStatus) {
                ScanButton.setAttribute('data-scan-status', 'on');
            } else {
                ScanButton.setAttribute('data-scan-status', 'off');
            }

        } else {
            sendToast('warning', 'Scanner', 'Admin must be logged in to use the autoscan mode!', false, false);
        }

    } else {  // Normal press action
        if (isTuneAuthenticated) {
            if (isScanOn) {
                sendScan('off');
                setCookie('scannerControlsStatus', 'off', 7); // Remember the status
            } else {
                sendScan('on');
                setCookie('scannerControlsStatus', 'on', 7); // Remember the status
            }
        } else {
			sendToast('warning', 'Scanner', 'Admin must be logged in to use the autoscan mode!', false, false);
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

        // Initialize scannerControls
        const scannerControlsStatus = getCookie('scannerControlsStatus');
        if (scannerControlsStatus === 'on' && isTuneAuthenticated) {
            createScannerControls(Sensitivity, ScannerMode, ScanHoldTime);
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
    function createScannerControls(Sensitivity, ScannerMode, ScanHoldTime) {
        const scannerControls = document.createElement('div');
        scannerControls.className = "no-bg h-100";
        scannerControls.id = "scanner-controls";
        scannerControls.style.width = '100%';
        scannerControls.style.display = 'flex';
        scannerControls.style.justifyContent = 'space-between';
        scannerControls.style.marginTop = "0px";     
		scannerControls.style.marginRight = "0px";
        scannerControls.style.position = 'relative'; // Ensure it's on top


        const sensitivityContainer = document.createElement('div');
        sensitivityContainer.className = "dropdown";
        sensitivityContainer.style.marginRight = "1px";
        sensitivityContainer.style.marginLeft = "0px";
        sensitivityContainer.style.width = "100%";
        sensitivityContainer.style.height = "99%";
        sensitivityContainer.style.position = 'relative'; // Ensure it's on top
		sensitivityContainer.style.borderTopLeftRadius = '15px';
		sensitivityContainer.style.borderTopRightRadius = '0px';
        sensitivityContainer.style.borderBottomLeftRadius = '15px';
		sensitivityContainer.style.borderBottomRightRadius = '0px';

        const modeContainer = document.createElement('div');
        modeContainer.className = "dropdown";
        modeContainer.style.marginRight = "1px";
        modeContainer.style.marginLeft = "0px";
        modeContainer.style.width = "100%";
        modeContainer.style.height = "99%";
        modeContainer.style.position = 'relative'; // Ensure it's on top     
		modeContainer.style.borderRadius = '0px';	
		
		let optionsHTML = `
			<input type="text" placeholder="${ScannerMode}" title="Scanner Mode" readonly>
			<ul class="options open-top" style="position: absolute; display: none; bottom: 100%; margin-bottom: 5px;">
			<li data-value="normal" class="option">normal</li>
		`;
		if (EnableBlacklist) {
			optionsHTML += `<li data-value="blacklist" class="option">blacklist</li>`;
		}
		if (EnableWhitelist) {
			optionsHTML += `<li data-value="whitelist" class="option">whitelist</li>`;
		}
		if (EnableSpectrumScan) {
			optionsHTML += `<li data-value="spectrum" class="option">spectrum</li>`;
		}
		if (EnableSpectrumScanBL) {
			optionsHTML += `<li data-value="spectrumBL" class="option">spectrumBL</li>`;
		}
		if (EnableDifferenceScan) {
			optionsHTML += `<li data-value="difference" class="option">difference</li>`;
		}
		if (EnableDifferenceScanBL) {
			optionsHTML += `<li data-value="differenceBL" class="option">differenceBL</li>`;
		}

		optionsHTML += `</ul>`;
		modeContainer.innerHTML = optionsHTML;
		
        const delayContainer = document.createElement('div');
        delayContainer.className = "dropdown";
        delayContainer.style.marginLeft = "0px";    
        delayContainer.style.width = "100%";
        delayContainer.style.height = "99%";
        delayContainer.style.position = 'relative'; // Ensure it's on top
		delayContainer.style.borderTopLeftRadius = '0px';
		delayContainer.style.borderTopRightRadius = '15px';
        delayContainer.style.borderBottomLeftRadius = '0px';
		delayContainer.style.borderBottomRightRadius = '15px';

        const VolumeSlider = document.getElementById('volumeSlider');
        const VolumeSliderWidth = VolumeSlider.clientWidth; // Get the width of the volume slider

        if (VolumeSliderWidth > 300) {
            delayContainer.style.marginRight = "0px";
        } else {
            delayContainer.style.marginRight = "5px";
        }
 if (ScanPE5PVBstatus) {
        sensitivityContainer.innerHTML = `
            <input type="text" placeholder="Sensitivity" title="Scanner Sensitivity" readonly>
            <ul class="options open-top" style="position: absolute; display: none; bottom: 100%; margin-bottom: 5px;">
                <li data-value="1" class="option">1</li>
				<li data-value="2" class="option">2</li>
				<li data-value="3" class="option">3</li>
				<li data-value="4" class="option">4</li>
                <li data-value="5" class="option">5</li>
                <li data-value="10" class="option">10</li>
                <li data-value="15" class="option">15</li>
                <li data-value="20" class="option">20</li>
                <li data-value="25" class="option">25</li>
                <li data-value="30" class="option">30</li>
            </ul>
        `;
    } else if (signalValue === 'dBf') {        
            sensitivityContainer.innerHTML = `
                <input type="text" placeholder="${Sensitivity} dBf" title="Scanner Sensitivity" readonly>
                <ul class="options open-top" style="position: absolute; display: none; bottom: 100%; margin-bottom: 5px;">
                    <li data-value="1" class="option">1 dBf</li>
					<li data-value="2" class="option">2 dBf</li>
					<li data-value="3" class="option">3 dBf</li>
					<li data-value="4" class="option">4 dBf</li>
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
					<li data-value="65" class="option">65 dBf</li>
                    <li data-value="70" class="option">70 dBf</li>
                    <li data-value="75" class="option">75 dBf</li>
                    <li data-value="80" class="option">80 dBf</li>
                </ul>
            `;
        } else if (signalValue === 'dBµV') {        
            sensitivityContainer.innerHTML = `
                <input type="text" placeholder="${Sensitivity} dBµV" title="Scanner Sensitivity" readonly>
                <ul class="options open-top" style="position: absolute; display: none; bottom: 100%; margin-bottom: 5px;">
				    <li data-value="1" class="option">1 dBµV</li>
					<li data-value="2" class="option">2 dBµV</li>
					<li data-value="3" class="option">3 dBµV</li>
					<li data-value="4" class="option">4 dBµV</li>
                    <li data-value="5" class="option">5 dBµV</li>
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
					<li data-value="65" class="option">65 dBµV</li>
                    <li data-value="70" class="option">70 dBµV</li>
                    <li data-value="75" class="option">85 dBµV</li>
                    <li data-value="80" class="option">90 dBµV</li>
                </ul>
            `;
        } else if (signalValue === 'dBm') {        
            sensitivityContainer.innerHTML = `
                <input type="text" placeholder="${Sensitivity} dBm" title="Scanner Sensitivity" readonly>
                <ul class="options open-top" style="position: absolute; display: none; bottom: 100%; margin-bottom: 5px;">
				    <li data-value="-111" class="option">-111 dBm</li>
				    <li data-value="-112" class="option">-112 dBm</li>
				    <li data-value="-113" class="option">-113 dBm</li>
				    <li data-value="-114" class="option">-114 dBm</li>
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
					<li data-value="-55" class="option">-55 dBm</li>
					<li data-value="-50" class="option">-50 dBm</li>
					<li data-value="-45" class="option">-45 dBm</li>
					<li data-value="-40" class="option">-40 dBm</li>
                </ul>
            `;
        }

        delayContainer.innerHTML = `
            <input type="text" placeholder="${ScanHoldTime} sec." title="Scanhold Time" readonly>
            <ul class="options open-top" style="position: absolute; display: none; bottom: 100%; margin-bottom: 5px;">
                <li data-value="1" class="option">1 sec.</li>
				<li data-value="2" class="option">2 sec.</li>
                <li data-value="3" class="option">3 sec.</li>
				<li data-value="4" class="option">4 sec.</li>
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

        if (!ScanPE5PVBstatus) {
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
					if (value >= SpectrumLimiterValueStatus && (ScannerModeStatus === 'spectrum' || ScannerModeStatus === 'spectrumBL' || ScannerModeStatus === 'difference' || ScannerModeStatus === 'differenceBL')) {
						sendToast('error important', 'Scanner', `Sensitivity must be smaller than SpectrumLimiter (${SpectrumLimiterValueStatus} ${signalValue})!`, false, false);
					}
                }
                if (commandPrefix === 'M') {
                    SendValue(Sensitivity, value, ScanHoldTime); // Convert seconds to milliseconds
					ScannerModeStatus = value;
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
	
window.initializeMapViewerButton = function() {
  const buttonId = "Mapviewer";
  // Get current domain info
  const currentDomain = window.location.hostname;
  const currentPort = window.location.port ? ':' + window.location.port : '';
  const baseUrl = `${window.location.protocol}//${currentDomain}${currentPort}`;
  const csvFileUrl = `${baseUrl}/logs/CSVfilename`;

  // Check if the CSV file exists by fetching it (cache-busting)
  fetch(csvFileUrl, { cache: "no-cache" })
    .then(response => {
      if (!response.ok) {
        throw new Error("File does not exist");
      }
      return response.text();
    })
    .then(initialContent => {
      // The file exists; create the button.
      const checkInterval = setInterval(() => {
        if (typeof addIconToPluginPanel === 'function') {
          clearInterval(checkInterval);
          console.log("addIconToPluginPanel found, adding Map Viewer button...");

          addIconToPluginPanel(buttonId, "Mapviewer", "solid", "globe", "Open URDS Map Viewer");

          setTimeout(() => {
            const button = document.getElementById(buttonId);
            if (button) {
              button.addEventListener('click', () => {
                // On button click, re-fetch the CSV file content
                fetch(csvFileUrl, { cache: "no-cache" })
                  .then(response => response.text())
                  .then(fileContent => {
                    const trimmedContent = fileContent.trim();
                    if (trimmedContent === "NoFileName") {
                      sendToast(
                        'warning',
                        'Scanner',
                        'No CSV Logfile currently available!',
                        false,
                        false
                      );
                    } else {
                      // Use the content as the CSV filename
                      const url = `https://tef.noobish.eu/logos/URDSMapViewer.html?file=https://cors-proxy.de:13128/${baseUrl}/logs/${trimmedContent}`;
                      console.log("Opening MapViewer URL:", url);
                      window.open(url, '_blank');
                    }
                  })
                  .catch(error => {
                    console.error("Error reading CSV file:", error);
                    sendToast(
                      'warning',
                      'Scanner',
                      'Error reading CSV Logfile!',
                      false,
                      false
                    );
                  });
              });

              console.log("✅ MapViewer button added successfully!");
            } else {
              console.error("❌ MapViewer button was not created. Check if addIconToPluginPanel appended it correctly.");
            }
          }, 1000);
        }
      }, 500);

    })
    .catch(error => {
      console.error("CSV file not found:", error);
    });
};

// Only initialize if not on a coarse pointer device (e.g. touch devices)
if (!window.matchMedia("(pointer: coarse)").matches) {
  initializeMapViewerButton();
}

    document.addEventListener('DOMContentLoaded', () => {	
        BlinkAutoScan();
        checkAdminMode();
        setupSendSocket();
    });
	
})();