(() => {
///////////////////////////////////////////////////////////////
///                                                         ///
///  SCANNER CLIENT SCRIPT FOR FM-DX-WEBSERVER (V3.9a)      ///
///                                                         ///
///  by Highpoint               last update: 26.11.25       ///
///  powered by PE5PVB                                      ///
///                                                         ///
///  https://github.com/Highpoint2000/webserver-scanner     ///
///                                                         ///
///////////////////////////////////////////////////////////////

/////// compatible from webserver version 1.3.8 !!! ///////////

    const pluginSetupOnlyNotify = true;
    const CHECK_FOR_UPDATES = true;

///////////////////////////////////////////////////////////////

    const pluginVersion = '3.9a';
    const pluginName         = "Scanner";
    const pluginHomepageUrl  = "https://github.com/Highpoint2000/webserver-scanner/releases";
    const pluginUpdateUrl    = "https://raw.githubusercontent.com/Highpoint2000/webserver-scanner/refs/heads/main/plugins/Scanner/scanner.js";

    const EnableBlacklist      = true; // auto from config
    const EnableWhitelist      = true; // auto from config
    const EnableSpectrumScan   = true; // auto from config
    const EnableSpectrumScanBL = true; // auto from config
    const EnableDifferenceScan = true; // auto from config
    const EnableDifferenceScanBL = true; // auto from config

    // IMPORTANT: now dynamic, NOT const
    let SignalStrengthUnit   = 'dBµV'; // initial, will be updated from UI

    const currentURL   = new URL(window.location.href);
    const WebserverURL = currentURL.hostname;
    const WebserverPath = currentURL.pathname.replace(/setup/g, '');
    const WebserverPORT = currentURL.port || (currentURL.protocol === 'https:' ? '443' : '80');
    const protocol     = currentURL.protocol === 'https:' ? 'wss:' : 'ws:';
    const WEBSOCKET_URL = `${protocol}//${WebserverURL}:${WebserverPORT}${WebserverPath}data_plugins`;
    const target       = '127.0.0.1';

    let wsSendSocket;
    let clientIp               = '';
    let isTuneAuthenticated    = false;
    let scannerButtonsExecuted = false;
    let Scan = 'off';
    let ScanPE5PVBstatus       = '';
    let SpectrumLimiterValueStatus;
    let ScannerModeStatus;

    // NEW: remember last internal values from server
    let lastInternalSensitivity = null;
    let lastScannerModeValue    = null;
    let lastScanHoldTimeValue   = null;

    ///////////////////////////////////////////////////////////
    // Helper: map UI label to internal SignalStrengthUnit
    ///////////////////////////////////////////////////////////
    function mapUnitLabelToInternal(label) {
        const txt = (label || '').toLowerCase();
        if (txt.includes('dbf'))  return 'dBf';
        if (txt.includes('dbuv')) return 'dBµV';  // canonical
        if (txt.includes('dbm'))  return 'dBm';
        return SignalStrengthUnit; // fallback: keep previous
    }

    ///////////////////////////////////////////////////////////
    // Create a status message object
    ///////////////////////////////////////////////////////////
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

    ///////////////////////////////////////////////////////////
    // Update-check for /setup
    ///////////////////////////////////////////////////////////
    function checkUpdate(setupOnly, pluginName, urlUpdateLink, urlFetchLink) {
        if (setupOnly && window.location.pathname !== '/setup') return;

        let pluginVersionCheck =
            typeof pluginVersion     !== 'undefined' ? pluginVersion :
            typeof plugin_version    !== 'undefined' ? plugin_version :
            typeof PLUGIN_VERSION    !== 'undefined' ? PLUGIN_VERSION :
            'Unknown';

async function fetchFirstLine() {
    const urlCheckForUpdate = urlFetchLink;

    try {
        const response = await fetch(urlCheckForUpdate);
        if (!response.ok) {
            throw new Error(`[${pluginName}] update check HTTP error! status: ${response.status}`);
        }

        const text  = await response.text();
        const lines = text.split('\n');

        let version;

        // Robuster: RegEx mit \s* statt exaktem " ="
        const versionRegex = /const\s+(?:pluginVersion|plugin_version|PLUGIN_VERSION)\s*=\s*['"]([^'"]+)['"]/;

        const versionLine = lines.find(line => versionRegex.test(line));
        if (versionLine) {
            const match = versionLine.match(versionRegex);
            if (match) {
                version = match[1];
            }
        }

        if (!version) {
            const firstLine = lines[0].trim();
            version = /^\d/.test(firstLine) ? firstLine : "Unknown";
        }

        return version;
    } catch (error) {
        console.error(`[${pluginName}] error fetching file:`, error);
        return null;
    }
}


        fetchFirstLine().then(newVersion => {
            if (newVersion && newVersion !== pluginVersionCheck) {
                const updateConsoleText = "There is a new version of this plugin available";
                console.log(`[${pluginName}] ${updateConsoleText}`);
                setupNotify(pluginVersionCheck, newVersion, pluginName, urlUpdateLink);
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

                const updateIcon =
                    document.querySelector('.wrapper-outer #navigation .sidenav-content .fa-puzzle-piece') ||
                    document.querySelector('.wrapper-outer .sidenav-content') ||
                    document.querySelector('.sidenav-content');

                const redDot = document.createElement('span');
                redDot.style.display = 'block';
                redDot.style.width = '12px';
                redDot.style.height = '12px';
                redDot.style.borderRadius = '50%';
                redDot.style.backgroundColor = '#FE0830' || 'var(--color-main-bright)';
                redDot.style.marginLeft = '82px';
                redDot.style.marginTop  = '-12px';

                if (updateIcon) {
                    updateIcon.appendChild(redDot);
                }
            }
        }
    }

    if (CHECK_FOR_UPDATES) {
        checkUpdate(pluginSetupOnlyNotify, pluginName, pluginHomepageUrl, pluginUpdateUrl);
    }

    ///////////////////////////////////////////////////////////
    // Initial WebSocket request
    ///////////////////////////////////////////////////////////
    async function sendInitialWebSocketMessage() {
        try {
            const response = await fetch('https://icanhazip.com');
            clientIp = (await response.text()).trim();
            console.log("Public IP address:", clientIp);

            const initialMessage = createMessage('request');

            if (wsSendSocket && wsSendSocket.readyState === WebSocket.OPEN) {
                wsSendSocket.send(JSON.stringify(initialMessage));
                console.log("Scanner sent initial message:", initialMessage);
            } else {
                console.error("Scanner Error! WebSocket is not open. Cannot send initial message.");
                sendToast('error important', 'Scanner', 'WebSocket is not open. Cannot send initial message.', false, false);
            }
        } catch (error) {
            console.error("Error fetching public IP address:", error);
            sendToast('error important', 'Scanner', 'Error fetching public IP address.', false, false);
        }
    }

    ///////////////////////////////////////////////////////////
    // Commands over WebSocket
    ///////////////////////////////////////////////////////////
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

    async function SendValue(Sensitivity, ScannerMode, ScanHoldTime) {
        const ssu = (SignalStrengthUnit || '').toLowerCase();
        let resultSensitivity;

        if (ssu === 'dbuv' || ssu === 'dbµv' || ssu === 'dbμv') {
            resultSensitivity = Math.round(parseFloat(Sensitivity) + 10.875);
        } else if (ssu === 'dbm') {
            resultSensitivity = Math.round(parseFloat(Sensitivity) + 119.75);
        } else if (ssu === 'dbf') {
            resultSensitivity = Math.round(parseFloat(Sensitivity));
        } else {
            resultSensitivity = Math.round(parseFloat(Sensitivity));
        }

        try {
            const valueMessage = createMessage('command', '', '', resultSensitivity, ScannerMode, ScanHoldTime);
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

    ///////////////////////////////////////////////////////////
    // WebSocket connection setup
    ///////////////////////////////////////////////////////////
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
                    setTimeout(setupSendSocket, 5000);
                };
            } catch (error) {
                console.error("Failed to setup Send WebSocket:", error);
                sendToast('error important', 'Scanner', 'Failed to setup Send WebSocket', false, false);
                setTimeout(setupSendSocket, 5000);
            }
        }
    }

    ///////////////////////////////////////////////////////////
    // Sensitivity normalization (internal → UI)
    ///////////////////////////////////////////////////////////
    function normalizeSensitivity(Sensitivity, unitStr) {
        const ssu = (unitStr || '').toLowerCase();
        let result;

        if (ssu === 'dbuv' || ssu === 'dbµv' || ssu === 'dbμv') {
            result = parseFloat(Sensitivity) - 10.875;
        } else if (ssu === 'dbm') {
            result = parseFloat(Sensitivity) - 119.75;
        } else if (ssu === 'dbf') {
            result = parseFloat(Sensitivity);
        } else {
            result = parseFloat(Sensitivity);
        }

        return Math.round(result);
    }

    ///////////////////////////////////////////////////////////
    // Toast with cooldown
    ///////////////////////////////////////////////////////////
    let lastToastTime = 0;

    function sendToastWithCooldown(type, title, message, autoClose = true, closeOnClick = true) {
        const currentTime = Date.now();
        if (currentTime - lastToastTime < 150) {
            return;
        }
        lastToastTime = currentTime;
        sendToast(type, title, message, autoClose, closeOnClick);
    }

    ///////////////////////////////////////////////////////////
    // WebSocket message handler
    ///////////////////////////////////////////////////////////
    function handleWebSocketMessage(event) {
        try {
            const eventData = JSON.parse(event.data);

            if (eventData.source !== clientIp) {
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

                // store last internal values for later re-render on unit change
                if (typeof Sensitivity !== 'undefined') {
                    lastInternalSensitivity = Sensitivity;
                }
                if (typeof ScannerMode !== 'undefined') {
                    lastScannerModeValue = ScannerMode;
                }
                if (typeof ScanHoldTime !== 'undefined') {
                    lastScanHoldTimeValue = ScanHoldTime;
                }

                if (status === 'response') {
                    if (!scannerButtonsExecuted) {
                        ScannerButtons(Sensitivity, ScannerMode, ScanHoldTime);
                        SearchButtons();
                        scannerButtonsExecuted = true;

                        if (isTuneAuthenticated) {
                            if (
                                ScannerMode === 'spectrum'   ||
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

                    const normSens = normalizeSensitivity(Sensitivity, SignalStrengthUnit);
                    updateDropdownValues(normSens, ScannerMode, ScanHoldTime);

                } else if (
                    status === 'broadcast' &&
                    InfoFMLIST &&
                    InfoFMLIST.includes("successful")
                ) {
                    sendToastWithCooldown('success important', 'Scanner', `${InfoFMLIST}`, false, false);
                    sendInitialWebSocketMessage();

                } else if (
                    status === 'broadcast' &&
                    InfoFMLIST &&
                    InfoFMLIST.includes("failed")
                ) {
                    sendToastWithCooldown('error important', 'Scanner', `${InfoFMLIST}`, false, false);
                    sendInitialWebSocketMessage();

                } else if (status === 'broadcast' || status === 'send') {
                    const normSens = normalizeSensitivity(Sensitivity, SignalStrengthUnit);
                    updateDropdownValues(normSens, ScannerMode, ScanHoldTime);
                }

                // Scan button behaviour (UI only)
                const ScanButton        = document.getElementById('Scan-on-off');
                const blinkTextElement  = document.querySelector('#tune-buttons .autoscan-blink');
                const scannerControls   = document.getElementById('scanner-controls');
                const HideElement       = document.querySelector('.panel-33.hide-phone.no-bg');
                const volumeSlider      = document.getElementById('volumeSlider');
                const volumeSliderParent = volumeSlider ? volumeSlider.parentNode : null;

                if (ScanButton) {
                    if (Scan === 'off') {
                        const element = document.getElementById('log-fmlist');
                        if (element) element.style.display = 'block';

                        ScanButton.setAttribute('data-scan-status', 'off');
                        ScanButton.classList.add('bg-color-3');
                        ScanButton.classList.remove('bg-color-4');

                        const freqDownElement = document.getElementById('freq-down');
                        if (freqDownElement) freqDownElement.style.display = 'block';

                        const freqUpElement = document.getElementById('freq-up');
                        if (freqUpElement) freqUpElement.style.display = 'block';

                        const searchDownElement = document.getElementById('search-down');
                        if (searchDownElement) searchDownElement.style.display = 'block';

                        const searchUpElement = document.getElementById('search-up');
                        if (searchUpElement) searchUpElement.style.display = 'block';

                        const commandInputElement = document.getElementById('commandinput');
                        if (commandInputElement) commandInputElement.style.display = 'block';

                        if (blinkTextElement) blinkTextElement.style.display = 'none';

                        if (window.innerWidth < 769) {
                            if (volumeSliderParent) volumeSliderParent.style.display = 'none';
                            if (scannerControls)    scannerControls.style.display    = 'none';
                            if (HideElement)        HideElement.classList.add('hide-phone');
                        }

                    } else if (Scan === 'on') {
                        const element = document.getElementById('log-fmlist');
                        if (element) element.style.display = 'none';

                        ScanButton.setAttribute('data-scan-status', 'on');
                        ScanButton.classList.add('bg-color-4');
                        ScanButton.classList.remove('bg-color-3');

                        const freqDownElement = document.getElementById('freq-down');
                        if (freqDownElement) freqDownElement.style.display = 'none';

                        const freqUpElement = document.getElementById('freq-up');
                        if (freqUpElement) freqUpElement.style.display = 'none';

                        const searchDownElement = document.getElementById('search-down');
                        if (searchDownElement) searchDownElement.style.display = 'none';

                        const searchUpElement = document.getElementById('search-up');
                        if (searchUpElement) searchUpElement.style.display = 'none';

                        const commandInputElement = document.getElementById('commandinput');
                        if (commandInputElement) commandInputElement.style.display = 'none';

                        if (blinkTextElement) blinkTextElement.style.display = 'block';

                        if (window.innerWidth < 769) {
                            if (volumeSliderParent) volumeSliderParent.style.display = 'none';
                            if (scannerControls)    scannerControls.style.display    = 'flex';
                            if (HideElement)        HideElement.classList.remove('hide-phone');
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Error handling WebSocket message:", error);
        }
    }

    ///////////////////////////////////////////////////////////
    // Update dropdown values (display)
    ///////////////////////////////////////////////////////////
    function updateDropdownValues(Sensitivity, ScannerMode, ScanHoldTime) {
        if (Sensitivity !== undefined && Sensitivity !== null && !Number.isNaN(Sensitivity)) {
            const sensitivityInput = document.querySelector('input[title="Scanner Sensitivity"]');
            if (sensitivityInput) {
                if (ScanPE5PVBstatus) {
                    sensitivityInput.value = `${Sensitivity}`;
                } else {
                    sensitivityInput.value = `${Sensitivity} ${SignalStrengthUnit}`;
                }
                sensitivityInput.setAttribute('data-value', Sensitivity);
            }
        }

        if (ScannerMode) {
            const modeInput = document.querySelector('input[title="Scanner Mode"]');
            if (modeInput) {
                modeInput.value = `${ScannerMode}`;
                modeInput.setAttribute('data-value', ScannerMode);
            }
        }

        if (ScanHoldTime) {
            const holdTimeInput = document.querySelector('input[title="Scanhold Time"]');
            if (holdTimeInput) {
                holdTimeInput.value = `${ScanHoldTime} sec.`;
                holdTimeInput.setAttribute('data-value', ScanHoldTime);
            }
        }
    }

    ///////////////////////////////////////////////////////////
    // Search buttons
    ///////////////////////////////////////////////////////////
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
        if (freqDownButton && freqDownButton.parentNode) {
            freqDownButton.parentNode.insertBefore(searchDownButton, freqDownButton.nextSibling);
        }

        const freqUpButton = document.getElementById('freq-up');
        if (freqUpButton && freqUpButton.parentNode) {
            freqUpButton.parentNode.insertBefore(searchUpButton, freqUpButton);
        }

        searchDownButton.addEventListener('click', function () {
            sendSearch('down');
        });

        searchUpButton.addEventListener('click', function () {
            sendSearch('up');
        });
    }

    ///////////////////////////////////////////////////////////
    // Autoscan blinking label
    ///////////////////////////////////////////////////////////
    function BlinkAutoScan() {
        console.log('BlinkAutoScan started');

        const parentElement = document.getElementById('tune-buttons');
        if (parentElement) {
            parentElement.classList.remove('no-bg');
            parentElement.style.position = 'relative';

            let blinkContainer = parentElement.querySelector('.autoscan-blink-container');
            if (!blinkContainer) {
                blinkContainer = document.createElement('div');
                blinkContainer.className = 'autoscan-blink-container';
                blinkContainer.style.position = 'absolute';
                blinkContainer.style.top = '0';
                blinkContainer.style.left = '0';
                blinkContainer.style.width = '100%';
                blinkContainer.style.height = '100%';
                blinkContainer.style.pointerEvents = 'none';
                blinkContainer.style.display = 'none';
                parentElement.appendChild(blinkContainer);
            }

            const blinkText = document.createElement('span');
            blinkText.textContent = 'Autoscan active!';
            blinkText.classList.add('autoscan-blink');
            blinkText.style.display = 'none';
            blinkContainer.appendChild(blinkText);

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

            setTimeout(() => {
                blinkContainer.style.display = 'block';
            }, 100);
        } else {
            console.warn('Element with the ID "tune-buttons" not found.');
        }
    }

    ///////////////////////////////////////////////////////////
    // Cookie helpers
    ///////////////////////////////////////////////////////////
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

    ///////////////////////////////////////////////////////////
    // Scanner main button
    ///////////////////////////////////////////////////////////
    function ScannerButtons(Sensitivity, ScannerMode, ScanHoldTime) {
        const ScannerButton = document.createElement('button');
        ScannerButton.id = 'Scan-on-off';
        ScannerButton.setAttribute('aria-label', 'Scan');
        ScannerButton.setAttribute('data-scan-status', 'off');
        ScannerButton.style.borderRadius = '0px';
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
                ScannerButton.style.width  = '100%';
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
                    ScannerButton.style.width  = '100%';
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

        let pressTimer;
        let isLongPress = false;

        ScannerButton.addEventListener('click', function () {
            const isActive = ScannerButton.getAttribute('data-scan-status') === 'on';
            if (!isLongPress) {
                if (isActive) {
                    ScannerButton.setAttribute('data-scan-status', 'off');
                    ScannerButton.style.backgroundColor = 'var(--color-3)';
                } else {
                    ScannerButton.setAttribute('data-scan-status', 'on');
                    ScannerButton.style.backgroundColor = 'var(--color-4)';
                }
            }
        });

        if (window.innerWidth < 769 && ScannerButton) {
            const popupContent = document.querySelector('.popup-content');
            if (popupContent) {
                const allParagraphs = popupContent.querySelectorAll('p.flex-phone.flex-center');
                let targetP = null;

                allParagraphs.forEach(p => {
                    const text = p.textContent.trim();
                    if (text === 'Bandwidth & Antennas' && !targetP) {
                        targetP = p;
                    } else if (text === 'Filters' && !targetP) {
                        targetP = p;
                    }
                });

                if (targetP && !document.getElementById('scanner-button-wrapper')) {
                    const scannerLabel = document.createElement('p');
                    scannerLabel.className = 'flex-phone flex-center';
                    scannerLabel.textContent = 'Scanner';

                    const scannerContainer = document.createElement('div');
                    scannerContainer.className = 'flex-container flex-phone flex-center';
                    scannerContainer.id = 'scanner-button-wrapper';
                    scannerContainer.style.marginBottom = '10px';

                    scannerContainer.appendChild(ScannerButton);

                    popupContent.insertBefore(scannerLabel, targetP);
                    popupContent.insertBefore(scannerContainer, scannerLabel.nextSibling);
                }
            }
        } else {
            const buttonIms = document.querySelector('.button-ims');
            if (buttonIms && ScannerButton) {
                const newDiv = document.createElement('div');
                newDiv.className = 'panel-50 no-bg br-0 h-100 m-0';
                newDiv.id = 'ScannerButtonWrapper';
                newDiv.appendChild(ScannerButton);
                buttonIms.parentNode.insertBefore(newDiv, buttonIms);
            }
        }

        function toggleScan(isLongPressAction) {
            const ScanButton = document.getElementById('Scan-on-off');
            const isScanOn  = ScanButton.getAttribute('data-scan-status') === 'on';

            const scannerControls = document.getElementById('scanner-controls');
            const volumeSlider    = document.getElementById('volumeSlider');
            const volumeSliderParent = volumeSlider ? volumeSlider.parentNode : null;

            if (isLongPressAction) {
                if (isTuneAuthenticated) {
                    const currentScanStatus = isScanOn;

                    if (scannerControls) {
                        scannerControls.parentNode.removeChild(scannerControls);
                        if (volumeSliderParent) {
                            volumeSliderParent.style.display = 'block';
                        }
                        setCookie('scannerControlsStatus', 'off', 7);
                    } else {
                        if (lastInternalSensitivity !== null) {
                            const norm = normalizeSensitivity(lastInternalSensitivity, SignalStrengthUnit);
                            createScannerControls(norm, lastScannerModeValue, lastScanHoldTimeValue);
                        } else {
                            createScannerControls(Sensitivity, ScannerMode, ScanHoldTime);
                        }
                        setCookie('scannerControlsStatus', 'on', 7);
                    }

                    if (currentScanStatus) {
                        ScanButton.setAttribute('data-scan-status', 'on');
                    } else {
                        ScanButton.setAttribute('data-scan-status', 'off');
                    }

                } else {
                    sendToast('warning', 'Scanner', 'Admin must be logged in to use the autoscan mode!', false, false);
                }
            } else {
                if (isTuneAuthenticated) {
                    if (isScanOn) {
                        sendScan('off');
                        setCookie('scannerControlsStatus', 'off', 7);
                    } else {
                        sendScan('on');
                        setCookie('scannerControlsStatus', 'on', 7);
                    }
                } else {
                    sendToast('warning', 'Scanner', 'Admin must be logged in to use the autoscan mode!', false, false);
                }
            }
        }

        function startPressTimer() {
            isLongPress = false;
            pressTimer = setTimeout(() => {
                isLongPress = true;
                toggleScan(true);
            }, 1000);
        }

        function cancelPressTimer() {
            clearTimeout(pressTimer);
            if (!isLongPress) {
                toggleScan(false);
            }
        }

        const ScanButton = document.getElementById('Scan-on-off');
        ScanButton.addEventListener('mousedown', startPressTimer);
        ScanButton.addEventListener('mouseup',   cancelPressTimer);

        const scannerControlsStatus = getCookie('scannerControlsStatus');
        if (scannerControlsStatus === 'on' && isTuneAuthenticated) {
            if (lastInternalSensitivity !== null) {
                const norm = normalizeSensitivity(lastInternalSensitivity, SignalStrengthUnit);
                createScannerControls(norm, lastScannerModeValue, lastScanHoldTimeValue);
            } else {
                createScannerControls(Sensitivity, ScannerMode, ScanHoldTime);
            }
        } else {
            const scannerControls = document.getElementById('scanner-controls');
            if (scannerControls) {
                scannerControls.parentNode.removeChild(scannerControls);
            }
        }
    }

    ///////////////////////////////////////////////////////////
    // Scanner controls
    ///////////////////////////////////////////////////////////
    function createScannerControls(Sensitivity, ScannerMode, ScanHoldTime) {
        const scannerControls = document.createElement('div');
        scannerControls.className = "no-bg h-100";
        scannerControls.id = "scanner-controls";
        scannerControls.style.width = '100%';
        scannerControls.style.display = 'flex';
        scannerControls.style.justifyContent = 'space-between';
        scannerControls.style.marginTop = "0px";
        scannerControls.style.marginRight = "0px";
        scannerControls.style.position = 'relative';

        const sensitivityContainer = document.createElement('div');
        sensitivityContainer.className = "dropdown";
        sensitivityContainer.style.marginRight = "1px";
        sensitivityContainer.style.marginLeft = "0px";
        sensitivityContainer.style.width = "100%";
        sensitivityContainer.style.height = "99%";
        sensitivityContainer.style.position = 'relative';
        sensitivityContainer.style.borderTopLeftRadius     = '15px';
        sensitivityContainer.style.borderTopRightRadius    = '0px';
        sensitivityContainer.style.borderBottomLeftRadius  = '15px';
        sensitivityContainer.style.borderBottomRightRadius = '0px';

        const modeContainer = document.createElement('div');
        modeContainer.className = "dropdown";
        modeContainer.style.marginRight = "1px";
        modeContainer.style.marginLeft  = "0px";
        modeContainer.style.width = "100%";
        modeContainer.style.height = "99%";
        modeContainer.style.position = 'relative';
        modeContainer.style.borderRadius = '0px';

        let optionsHTML = `
            <input type="text" placeholder="${ScannerMode}" title="Scanner Mode" readonly>
            <ul class="options open-top" style="position: absolute; display: none; bottom: 100%; margin-bottom: 5px;">
                <li data-value="normal" class="option">normal</li>
        `;
        if (EnableBlacklist)      optionsHTML += `<li data-value="blacklist" class="option">blacklist</li>`;
        if (EnableWhitelist)      optionsHTML += `<li data-value="whitelist" class="option">whitelist</li>`;
        if (EnableSpectrumScan)   optionsHTML += `<li data-value="spectrum" class="option">spectrum</li>`;
        if (EnableSpectrumScanBL) optionsHTML += `<li data-value="spectrumBL" class="option">spectrumBL</li>`;
        if (EnableDifferenceScan) optionsHTML += `<li data-value="difference" class="option">difference</li>`;
        if (EnableDifferenceScanBL) optionsHTML += `<li data-value="differenceBL" class="option">differenceBL</li>`;
        optionsHTML += `</ul>`;
        modeContainer.innerHTML = optionsHTML;

        const delayContainer = document.createElement('div');
        delayContainer.className = "dropdown";
        delayContainer.style.marginLeft = "0px";
        delayContainer.style.width  = "100%";
        delayContainer.style.height = "99%";
        delayContainer.style.position = 'relative';
        delayContainer.style.borderTopLeftRadius     = '0px';
        delayContainer.style.borderTopRightRadius    = '15px';
        delayContainer.style.borderBottomLeftRadius  = '0px';
        delayContainer.style.borderBottomRightRadius = '15px';

        const VolumeSlider = document.getElementById('volumeSlider');
        const VolumeSliderWidth = VolumeSlider ? VolumeSlider.clientWidth : 0;

        delayContainer.style.marginRight = VolumeSliderWidth > 300 ? "0px" : "5px";

        const unit = (SignalStrengthUnit || '').toLowerCase();

        if (ScanPE5PVBstatus) {
            sensitivityContainer.innerHTML = `
                <input type="text" placeholder="Sensitivity" title="Scanner Sensitivity" readonly>
                <ul class="options open-top" style="position: absolute; display: none; bottom: 100%; margin-bottom: 5px;">
                    <li data-value="1"  class="option">1</li>
                    <li data-value="2"  class="option">2</li>
                    <li data-value="3"  class="option">3</li>
                    <li data-value="4"  class="option">4</li>
                    <li data-value="5"  class="option">5</li>
                    <li data-value="10" class="option">10</li>
                    <li data-value="15" class="option">15</li>
                    <li data-value="20" class="option">20</li>
                    <li data-value="25" class="option">25</li>
                    <li data-value="30" class="option">30</li>
                </ul>
            `;
        } else if (unit === 'dbf') {
            sensitivityContainer.innerHTML = `
                <input type="text" placeholder="${Sensitivity} dBf" title="Scanner Sensitivity" readonly>
                <ul class="options open-top" style="position: absolute; display: none; bottom: 100%; margin-bottom: 5px;">
                    <li data-value="1"  class="option">1 dBf</li>
                    <li data-value="2"  class="option">2 dBf</li>
                    <li data-value="3"  class="option">3 dBf</li>
                    <li data-value="4"  class="option">4 dBf</li>
                    <li data-value="5"  class="option">5 dBf</li>
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
        } else if (unit === 'dbuv' || unit === 'dbµv' || unit === 'dbμv') {
            sensitivityContainer.innerHTML = `
                <input type="text" placeholder="${Sensitivity} dBuV" title="Scanner Sensitivity" readonly>
                <ul class="options open-top" style="position: absolute; display: none; bottom: 100%; margin-bottom: 5px;">
                    <li data-value="1"  class="option">1 dBuV</li>
                    <li data-value="2"  class="option">2 dBuV</li>
                    <li data-value="3"  class="option">3 dBuV</li>
                    <li data-value="4"  class="option">4 dBuV</li>
                    <li data-value="5"  class="option">5 dBuV</li>
                    <li data-value="10" class="option">10 dBuV</li>
                    <li data-value="15" class="option">15 dBuV</li>
                    <li data-value="20" class="option">20 dBuV</li>
                    <li data-value="25" class="option">25 dBuV</li>
                    <li data-value="30" class="option">30 dBuV</li>
                    <li data-value="35" class="option">35 dBuV</li>
                    <li data-value="40" class="option">40 dBuV</li>
                    <li data-value="45" class="option">45 dBuV</li>
                    <li data-value="50" class="option">50 dBuV</li>
                    <li data-value="55" class="option">55 dBuV</li>
                    <li data-value="60" class="option">60 dBuV</li>
                    <li data-value="65" class="option">65 dBuV</li>
                    <li data-value="70" class="option">70 dBuV</li>
                    <li data-value="75" class="option">75 dBuV</li>
                    <li data-value="80" class="option">80 dBuV</li>
                </ul>
            `;
        } else if (unit === 'dbm') {
            sensitivityContainer.innerHTML = `
                <input type="text" placeholder="${Sensitivity} dBm" title="Scanner Sensitivity" readonly>
                <ul class="options open-top" style="position: absolute; display: none; bottom: 100%; margin-bottom: 5px;">
                    <li data-value="-115" class="option">-115 dBm</li>
                    <li data-value="-112" class="option">-112 dBm</li>
                    <li data-value="-113" class="option">-113 dBm</li>
                    <li data-value="-114" class="option">-114 dBm</li>
                    <li data-value="-110" class="option">-110 dBm</li>
                    <li data-value="-105" class="option">-105 dBm</li>
                    <li data-value="-100" class="option">-100 dBm</li>
                    <li data-value="-95"  class="option">-95 dBm</li>
                    <li data-value="-90"  class="option">-90 dBm</li>
                    <li data-value="-85"  class="option">-85 dBm</li>
                    <li data-value="-80"  class="option">-80 dBm</li>
                    <li data-value="-75"  class="option">-75 dBm</li>
                    <li data-value="-70"  class="option">-70 dBm</li>
                    <li data-value="-65"  class="option">-65 dBm</li>
                    <li data-value="-60"  class="option">-60 dBm</li>
                    <li data-value="-55"  class="option">-55 dBm</li>
                    <li data-value="-50"  class="option">-50 dBm</li>
                    <li data-value="-45"  class="option">-45 dBm</li>
                    <li data-value="-40"  class="option">-40 dBm</li>
                </ul>
            `;
        } else {
            sensitivityContainer.innerHTML = `
                <input type="text" placeholder="${Sensitivity}" title="Scanner Sensitivity" readonly>
            `;
        }

        delayContainer.innerHTML = `
            <input type="text" placeholder="${ScanHoldTime} sec." title="Scanhold Time" readonly>
            <ul class="options open-top" style="position: absolute; display: none; bottom: 100%; margin-bottom: 5px;">
                <li data-value="1"  class="option">1 sec.</li>
                <li data-value="2"  class="option">2 sec.</li>
                <li data-value="3"  class="option">3 sec.</li>
                <li data-value="4"  class="option">4 sec.</li>
                <li data-value="5"  class="option">5 sec.</li>
                <li data-value="7"  class="option">7 sec.</li>
                <li data-value="10" class="option">10 sec.</li>
                <li data-value="15" class="option">15 sec.</li>
                <li data-value="20" class="option">20 sec.</li>
                <li data-value="30" class="option">30 sec.</li>
            </ul>
        `;

        scannerControls.appendChild(sensitivityContainer);
        initializeDropdown(sensitivityContainer, 'Selected Sensitivity:', 'I', Sensitivity, ScannerMode, ScanHoldTime);

        if (!ScanPE5PVBstatus) {
            modeContainer.style.display = 'block';
            scannerControls.appendChild(modeContainer);
            initializeDropdown(modeContainer, 'Selected Mode:', 'M', Sensitivity, ScannerMode, ScanHoldTime);
        }

        scannerControls.appendChild(delayContainer);
        initializeDropdown(delayContainer, 'Selected Delay:', 'K', Sensitivity, ScannerMode, ScanHoldTime);

        const volumeSlider = document.getElementById('volumeSlider');
        const volumeSliderParent = volumeSlider ? volumeSlider.parentNode : null;
        if (volumeSliderParent) {
            volumeSliderParent.style.display = 'none';
            volumeSliderParent.parentNode.insertBefore(scannerControls, volumeSliderParent.nextSibling);
        }
    }

    ///////////////////////////////////////////////////////////
    // Dropdown logic
    ///////////////////////////////////////////////////////////
    function initializeDropdown(container, logPrefix, commandPrefix, Sensitivity, ScannerMode, ScanHoldTime) {
        const input    = container.querySelector('input');
        const options  = container.querySelectorAll('.option');
        const dropdown = container.querySelector('.options');

        input.addEventListener('click', () => {
            const isOpen = dropdown.style.display === 'block';
            closeAllDropdowns();
            dropdown.style.display = isOpen ? 'none' : 'block';
        });

        options.forEach(option => {
            option.addEventListener('click', () => {
                const value = option.getAttribute('data-value');
                input.value = option.textContent.trim();
                input.setAttribute('data-value', value);
                dropdown.style.display = 'none';

                if (commandPrefix === 'I') {
                    SendValue(value, ScannerMode, ScanHoldTime);
                    if (
                        SpectrumLimiterValueStatus &&
                        value >= SpectrumLimiterValueStatus &&
                        (ScannerModeStatus === 'spectrum'   ||
                         ScannerModeStatus === 'spectrumBL' ||
                         ScannerModeStatus === 'difference' ||
                         ScannerModeStatus === 'differenceBL')
                    ) {
                        sendToast('error important', 'Scanner', `Sensitivity must be smaller than SpectrumLimiter (${SpectrumLimiterValueStatus} ${SignalStrengthUnit})!`, false, false);
                    }
                }
                if (commandPrefix === 'M') {
                    SendValue(Sensitivity, value, ScanHoldTime);
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

    function closeAllDropdowns() {
        const allDropdowns = document.querySelectorAll('.dropdown .options');
        allDropdowns.forEach(dropdown => {
            dropdown.style.display = 'none';
        });
    }

    ///////////////////////////////////////////////////////////
    // Admin / Tune authentication check
    ///////////////////////////////////////////////////////////
    function checkAdminMode() {
        const bodyText = document.body.textContent || document.body.innerText;
        const isAdminLoggedIn =
            bodyText.includes("You are logged in as an administrator.") ||
            bodyText.includes("You are logged in as an adminstrator.");
        const canControlReceiver =
            bodyText.includes("You are logged in and can control the receiver.");

        if (isAdminLoggedIn || canControlReceiver) {
            console.log("Admin or Tune mode found. Scanner Plugin Authentication successful.");
            isTuneAuthenticated = true;
        } else {
            console.log("No special authentication message found. Authentication failed.");
            isTuneAuthenticated = false;
        }
    }

    ///////////////////////////////////////////////////////////
    // Mapviewer button (CSV check)
    ///////////////////////////////////////////////////////////
    window.initializeMapViewerButton = function () {
        const buttonId = "Mapviewer";

        const currentDomain = window.location.hostname;
        const currentPort   = window.location.port ? ':' + window.location.port : '';
        const baseUrl       = `${window.location.protocol}//${currentDomain}${currentPort}`;
        const csvFileUrl    = `${baseUrl}/logs/CSVfilename`;

        fetch(csvFileUrl, { cache: "no-cache" })
            .then(response => {
                if (!response.ok) {
                    throw new Error("File does not exist");
                }
                return response.text();
            })
            .then(initialContent => {
                const checkInterval = setInterval(() => {
                    if (typeof addIconToPluginPanel === 'function') {
                        clearInterval(checkInterval);
                        console.log("addIconToPluginPanel found, adding Map Viewer button...");

                        addIconToPluginPanel(buttonId, "Mapviewer", "solid", "globe", "Open URDS Map Viewer");

                        setTimeout(() => {
                            const button = document.getElementById(buttonId);
                            if (button) {
                                button.addEventListener('click', () => {
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
                if (error.message === "File does not exist") {
                    return; // silently ignore missing CSV
                }
                console.error("CSV file fetch error:", error);
            });
    };

    if (!window.matchMedia("(pointer: coarse)").matches) {
        initializeMapViewerButton();
    }

    ///////////////////////////////////////////////////////////
    // NEW: Watcher for Signal Units dropdown
    ///////////////////////////////////////////////////////////
    function initSignalUnitWatcher() {
        const input = document.getElementById('signal-selector-input');
        if (!input) {
            console.log('[Scanner] Signal unit selector not found, skipping unit watcher.');
            return;
        }

        // Initial sync
        const initialLabel = input.value || input.placeholder || '';
        SignalStrengthUnit = mapUnitLabelToInternal(initialLabel);
        console.log('[Scanner] Initial SignalStrengthUnit from UI:', SignalStrengthUnit);

        const observer = new MutationObserver(mutations => {
            let changed = false;
            mutations.forEach(m => {
                if (m.type === 'attributes' &&
                    (m.attributeName === 'value' || m.attributeName === 'placeholder')) {
                    changed = true;
                }
            });

            if (changed) {
                const label = input.value || input.placeholder || '';
                const newUnit = mapUnitLabelToInternal(label);
                if (newUnit !== SignalStrengthUnit) {
                    console.log('[Scanner] Signal unit changed in UI →', SignalStrengthUnit, '→', newUnit);
                    SignalStrengthUnit = newUnit;

                    // Re-render scanner controls and sensitivity display using last internal values
                    if (lastInternalSensitivity !== null) {
                        const norm = normalizeSensitivity(lastInternalSensitivity, SignalStrengthUnit);
                        updateDropdownValues(norm, lastScannerModeValue, lastScanHoldTimeValue);

                        const existing = document.getElementById('scanner-controls');
                        if (existing && isTuneAuthenticated) {
                            existing.parentNode.removeChild(existing);
                            createScannerControls(norm, lastScannerModeValue, lastScanHoldTimeValue);
                        }
                    }
                }
            }
        });

        observer.observe(input, {
            attributes: true,
            attributeFilter: ['value', 'placeholder']
        });
    }

    ///////////////////////////////////////////////////////////
    // DOM ready
    ///////////////////////////////////////////////////////////
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            initSignalUnitWatcher();   // <--- wichtig: Einheit aus UI übernehmen + beobachten
            BlinkAutoScan();
            checkAdminMode();
            setupSendSocket();
        }, 1000);
    });

    ///////////////////////////////////////////////////////////
    // Toast wrapper (global safe)
    ///////////////////////////////////////////////////////////
    function sendToast(type, title, message, autoClose = true, closeOnClick = true) {
        if (typeof window.sendToast === "function") {
            window.sendToast(type, title, message, autoClose, closeOnClick);
        } else {
            console.log(`[${title}] ${message}`);
        }
    }

})();
