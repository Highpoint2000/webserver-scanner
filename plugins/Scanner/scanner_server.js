///////////////////////////////////////////////////////////////
///                                                         ///
///  SCANNER SERVER SCRIPT FOR FM-DX-WEBSERVER (V2.2a BETA) /// 
///                                                         ///
///  by Highpoint               last update: 30.08.24       ///
///  powered by PE5PVB                                      ///     
///                                                         ///
///  https://github.com/Highpoint2000/webserver-scanner     ///
///                                                         ///
///////////////////////////////////////////////////////////////

///  This plugin only works from web server version 1.2.6!!!

const Autoscan_PE5PVB_Mode = false; 	// Set to "true" if ESP32 with PE5PVB firmware is being used and you want to use the auto scan mode of the firmware
const Search_PE5PVB_Mode = false; 		// Set to "true" if ESP32 with PE5PVB firmware is being used and you want to use the search mode of the firmware
const StartAutoScan = 'auto'; 			// Set to "off/on/auto" (on - starts with webserver, auto - starts scanning after 10 s when no user is connected)
const AntennaSwitch = 'false';  		// Set to "off/on" for automatic switching with more than 1 antenna at the upper band limit

let defaultSensitivityValue = 25; 		// Value in dBf/dBµV: 5,10,15,20,25,30,35,40,45,50,55,60 | in dBm: -115,-110,-105,-100,-95,-90,-85,-80,-75,-70,-65,-60
let defaultScanHoldTime = 7; 			// Value in s: 1,3,5,7,10,15,20,30 
let defaultScannerMode = 'blacklist'; 	// Only valid for Autoscan_PE5PVB_Mode = false  /  Set the startmode: "normal", "blacklist", or "whitelist"

/// LOGGER OPTIONS ////
const FilteredLog = true; 		// Set to "true" or "false" for filtered data logging
const RAWLog = false;			// Set to "true" or "false" for RAW data logging
const OnlyFirstLog = true;      // For only first seen logging, set each station found to “true” or “false”. 
const UTCtime = true; 			// Set to "true" for logging with UTC Time
const FMLIST_OM_ID = '8082'; 	// To use the logbook function, please enter your OM ID here, for example: FMLIST_OM_ID = '1234'

//////////////////////////////////////////////////////////////////////////////////////

const pluginVersion = 'V2.2 BETA'; 

const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const { logInfo, logError, logWarn } = require('./../../server/console');
const config = require('./../../config.json');

const ServerName = config.identification.tunerName; 
const ServerDescription = config.identification.tunerDesc; 
const DefaultFreq = config.defaultFreq;
const enableDefaultFreq = config.enableDefaultFreq;
const Antennas = config.antennas;
const webserverPort = config.webserver.webserverPort || 8080; // Default to port 8080 if not specified
const LAT = config.identification.lat; 
const LON = config.identification.lon; 

const externalWsUrl = `ws://127.0.0.1:${webserverPort}`;
const ScanPE5PVB = Autoscan_PE5PVB_Mode;
const SearchPE5PVB = Search_PE5PVB_Mode;
const status = '';
const Search = '';
const source = '127.0.0.1';
const logDir = path.resolve(__dirname, '../../web/logs'); // Absoluter Pfad zum Log-Verzeichnis

if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

let textSocket;
let extraSocket;
let autoScanSocket;
let blacklist = [];
let whitelist = [];
let isScanning = false;
let currentFrequency = 0;
let previousFrequency = 0;
let checkStrengthCounter = 0;
let stereo_detect = false;
let sensitivityValue = defaultSensitivityValue;
let modeValue = defaultScannerMode;
let stereo_forced_user = 'stereo';
let scanInterval = null; 
let autoScanActive = false; 
let autoScanTimer; 
let autoScanScheduled = false; 
let Sensitivity = defaultSensitivityValue;
let ScannerMode = defaultScannerMode;
let ScanHoldTime = defaultScanHoldTime;
let Scan;
let enabledAntennas = [];
let currentIndex = 0;
let picode, Savepicode, ps, Saveps, Prevps, freq, Savefreq, strength, stereo, stereo_forced, ant, station, pol, erp, city, itu, distance, azimuth, stationid, Savestationid;
let CSV_LogfilePath;
let CSV_LogfilePath_filtered;
let HTML_LogfilePath;
let HTML_LogfilePath_filtered;
let stationidAll;
let tuningLowerLimit = config.webserver.tuningLowerLimit;
let tuningUpperLimit = config.webserver.tuningUpperLimit;
let tuningLimit = config.webserver.tuningLimit;

if (tuningUpperLimit === '' || !tuningLimit) {
	tuningUpperLimit = '108.0';
}

if (tuningLowerLimit === '' || !tuningLimit) {
	tuningLowerLimit = '87.5';
}

if (StartAutoScan !== 'auto') {
   Scan = StartAutoScan;
} else {
   Scan = 'off';
}

// Create a status message object
function createMessage(status, target, Scan, Search, Sensitivity, ScannerMode, ScanHoldTime) {
    return {
        type: 'Scanner',
        value: {
			status: status,
			ScanPE5PVB: Autoscan_PE5PVB_Mode,
            Scan: Scan,
			SearchPE5PVB: Search_PE5PVB_Mode,
            Search: Search,	 
            Sensitivity: Sensitivity,
            ScannerMode: ScannerMode,
            ScanHoldTime: ScanHoldTime
        },
        source: source,
        target: target
    };
}


async function TextWebSocket(messageData) {
    let autoScanStopped = false; // Flag to ensure the block runs only once

    if (!textSocket || textSocket.readyState === WebSocket.CLOSED) {
        try {
            textSocket = new WebSocket(`${externalWsUrl}/text`);

            textSocket.onopen = () => {
                logInfo("Scanner connected to WebSocket");

                if (ScanPE5PVB) {
                    sendCommandToClient(`I${defaultSensitivityValue}`);
                    sendCommandToClient(`K${defaultScanHoldTime}`);
                    logInfo(`Scanner set auto-scan "${StartAutoScan}" sensitivity "${defaultSensitivityValue}" scanholdtime "${defaultScanHoldTime}" (PE5PVB mode)`);
                } else {
                    logInfo(`Scanner set auto-scan "${StartAutoScan}" sensitivity "${defaultSensitivityValue}" mode "${defaultScannerMode}" scanholdtime "${defaultScanHoldTime}"`);
                }

                textSocket.onmessage = (event) => {
                    try {
                        // Parse the incoming message data
                        const messageData = JSON.parse(event.data);
						// console.log(messageData);

                        // Execute this block only once
                        const users = messageData.users;  
                        if (StartAutoScan === 'auto' && !autoScanStopped && users > 0) {
                            logInfo(`Scanner stopped auto-scan [User: ${users}]`);
                            autoScanStopped = true; // Set the flag to true after first execution
                        }

                        handleSocketMessage(messageData);  // Pass the parsed data to the handler
                    } catch (error) {
                        logError("Failed to parse WebSocket message:", error);
                    }
                };
            };

            textSocket.onerror = (error) => logError("WebSocket error:", error);

            textSocket.onclose = () => {
                logInfo("Scanner closed WebSocket");
                setTimeout(() => TextWebSocket(messageData), 1000); // Pass messageData when reconnecting
            };

        } catch (error) {
            logError("Scanner Failed to set up WebSocket:", error);
            setTimeout(() => TextWebSocket(messageData), 1000); // Pass messageData when reconnecting
        }
    }
}


function startSearch(direction) {
    // Restart scanning in the specified direction
    clearInterval(scanInterval);
    isScanning = false;
    setTimeout(() => startScan(direction), 150);
    }

async function ExtraWebSocket() {
    if (!extraSocket || extraSocket.readyState === WebSocket.CLOSED) {
        try {
            extraSocket = new WebSocket(externalWsUrl + '/extra');

            extraSocket.onopen = () => {
                logInfo(`Scanner connected to ${externalWsUrl + '/extra'}`);
            };

            extraSocket.onerror = (error) => {
                logError("WebSocket error:", error);
            };

            extraSocket.onclose = () => {
                logInfo("Scanner WebSocket closed.");
                setTimeout(ExtraWebSocket, 1000); // Increased delay for reconnection
            };

            extraSocket.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    // console.log("Received message:", message);

                    if (message.type === 'Scanner' && message.source !== source) {

                        let responseMessage;
                        switch (message.value.status) {
                            case 'request':
                                // Create the response message
                                responseMessage = createMessage(
                                    'response',
                                    message.source,
                                    Scan,
                                    '',
                                    Sensitivity,
                                    ScannerMode,
                                    ScanHoldTime
                                );

                                // Send the response message
                                extraSocket.send(JSON.stringify(responseMessage));
                                // logInfo(`Sent response message: ${JSON.stringify(responseMessage)}`);
                                break;

                            case 'send':
                                if (message.value.Sensitivity !== undefined && message.value.Sensitivity !== '') {
                                    Sensitivity = message.value.Sensitivity;
									if (ScanPE5PVB) {        
										sendCommandToClient(`I${Sensitivity}`);
										logInfo(`Scanner (PE5PVB mode) set sensitivity "${Sensitivity}" [IP: ${message.source}]`);
									} else {
										logInfo(`Scanner set sensitivity "${Sensitivity}" [IP: ${message.source}]`);
									}
                                }
                                if (message.value.ScannerMode !== undefined && message.value.ScannerMode === 'normal') {
                                    ScannerMode = message.value.ScannerMode;
									logInfo(`Scanner set mode "${ScannerMode}" [IP: ${message.source}]`);
                                }
								if (message.value.ScannerMode !== undefined && message.value.ScannerMode === 'blacklist') {
									if (blacklist.length > 0) {
										ScannerMode = message.value.ScannerMode;
										logInfo(`Scanner set mode "${ScannerMode}" [IP: ${message.source}]`);
									} else {
										logInfo(`Scanner mode "${message.value.ScannerMode}" not available! [IP: ${message.source}]`);
										ScannerMode = 'normal';			
										
										responseMessage = createMessage(
											'response',
											message.source,
											Scan,
											'',
											Sensitivity,
											ScannerMode,
											ScanHoldTime
										);
								
										extraSocket.send(JSON.stringify(responseMessage));
									}
								}
								if (message.value.ScannerMode !== undefined && message.value.ScannerMode === 'whitelist') {
									if (whitelist.length > 0) {
										ScannerMode = message.value.ScannerMode;
										logInfo(`Scanner set mode "${ScannerMode}" [IP: ${message.source}]`);
									} else {
										logInfo(`Scanner mode "${message.value.ScannerMode}" not available! [IP: ${message.source}]`);
										ScannerMode = 'normal';			
										
										responseMessage = createMessage(
											'response',
											message.source,
											Scan,
											'',
											Sensitivity,
											ScannerMode,
											ScanHoldTime
										);
								
										extraSocket.send(JSON.stringify(responseMessage));
									}
								}
                                if (message.value.ScanHoldTime !== undefined && message.value.ScanHoldTime !== '') {
                                    ScanHoldTime = message.value.ScanHoldTime;
									if (ScanPE5PVB) {        
										sendCommandToClient(`K${ScanHoldTime}`);
										logInfo(`Scanner (PE5PVB mode) set scanholdtime "${ScanHoldTime}" [IP: ${message.source}]`);
									} else {
										logInfo(`Scanner set scanholdtime "${ScanHoldTime}" [IP: ${message.source}]`);
									}
                                }
                                if (message.value.Search === 'down') {
									if (SearchPE5PVB) {
										sendCommandToClient('C1');
										// logInfo(`Scanner (PE5PVB mode) search down [IP: ${message.source}]`);
									} else {
										startSearch('down');
										// logInfo(`Scanner search down [IP: ${message.source}]`);
									}
                                }
                                if (message.value.Search === 'up') {
									if (SearchPE5PVB) {
										sendCommandToClient('C2');
										// logInfo(`Scanner (PE5PVB mode) search up [IP: ${message.source}] `);
									} else {
										startSearch('up');
										// logInfo(`Scanner search up [IP: ${message.source}]`);
									}
                                }
								
								responseMessage = createMessage(
                                    'broadcast',
                                    message.source,
                                    message.value.Scan,
                                    '',
                                    Sensitivity,
                                    ScannerMode,
                                    ScanHoldTime,
                                );
								
                                if (message.value.Scan === 'on' && Scan === 'off') {
									
									Scan = message.value.Scan;
									extraSocket.send(JSON.stringify(responseMessage));
									
									if (ScanPE5PVB) {
										logInfo(`Scanner (PE5PVB mode) starts auto-scan [IP: ${message.source}]`);
										logInfo(`Scanner Tuning Range: ${tuningLowerLimit} MHz - ${tuningUpperLimit} MHz | Sensitivity: "${Sensitivity}" | Scanholdtime: "${ScanHoldTime}"`);
									    sendCommandToClient('J1');
									} else {
										logInfo(`Scanner starts auto-scan [IP: ${message.source}]`);
										logInfo(`Scanner Tuning Range: ${tuningLowerLimit} MHz - ${tuningUpperLimit} MHz | Sensitivity: "${Sensitivity}" | Mode: "${ScannerMode}" | Scanholdtime: "${ScanHoldTime}"`);
										AutoScan();
									}
																	
                                }
                                if (message.value.Scan === 'off' && Scan === 'on') {
									
									Scan = message.value.Scan;
									extraSocket.send(JSON.stringify(responseMessage));
									
									if (ScanPE5PVB) {
										logInfo(`Scanner (PE5PVB mode) stops auto-scan [${message.source}]`);
									    sendCommandToClient('J0');
									} else {
										logInfo(`Scanner stops auto-scan [IP: ${message.source}]`);
										stopAutoScan();
									}
                                }                             
								
                                break;

                            default:
                                logError(`Unknown status type: ${message.value.status}`);
                                break;
                        }
                    }
                } catch (error) {
                    logError("Failed to handle message:", error);
                }
            };

        } catch (error) {
            logError("Failed to set up WebSocket:", error);
            setTimeout(ExtraWebSocket, 1000); // Increased delay for reconnection
        }
    }
}

function InitialMessage() {
    const ws = new WebSocket(externalWsUrl + '/extra');
    ws.on('open', () => {
        // logInfo(`Scanner connected to ${ws.url}`);	
        ws.send(JSON.stringify(createMessage('broadcast', '255.255.255.255', 'off', 'off', defaultSensitivityValue, defaultScannerMode, defaultScanHoldTime))); // Send initial status
    });
}

function sendDataToClient(frequency) {
    if (textSocket && textSocket.readyState === WebSocket.OPEN) {
        const dataToSend = `T${(frequency * 1000).toFixed(0)}`;
        textSocket.send(dataToSend);
        // logInfo("WebSocket sent:", dataToSend);
    } else {
        logError('WebSocket not open.');
        setTimeout(() => sendDataToClient(frequency), 100); // Retry after a short delay
    }
}

async function sendCommandToClient(command) {
    try {
        // Ensure the TextWebSocket connection is established
        await TextWebSocket();

        if (textSocket && textSocket.readyState === WebSocket.OPEN) {
        //    logInfo("WebSocket connected, sending command");
            sendCommand(textSocket, command);
        } else {
            logError("WebSocket is not open. Unable to send command.");
        }
    } catch (error) {
        logError("Failed to send command to client:", error);
    }
}


function sendCommand(socket, command) {
    // logInfo("Scanner send command:", command);
    socket.send(command);
}


let counter = 0; // Declare the counter variable

function checkUserCount(users) {

    // Check if the conditions for starting the auto-scan are met
    if (users === 0) {
        counter++; // Increment the counter when users === 0
        if (counter >= 5) { // Check if the counter has reached 5
            if (!autoScanActive && StartAutoScan === 'auto') {
                if (!autoScanScheduled) {
                    // Set a timeout to start the auto-scan after 10 seconds
                    autoScanTimer = setTimeout(() => {	
                        // Activate auto-scan
                        autoScanActive = true;  
                        Scan = 'on';

                        // Create and send a broadcast message to start the scan
                        const Message = createMessage(
                            'broadcast',
                            '255.255.255.255',
                            Scan,
                            '',
                            Sensitivity,
                            ScannerMode,
                            ScanHoldTime
                        );

                        if (users === 0) {
                            extraSocket.send(JSON.stringify(Message));

                            // Log and handle the scan based on the mode
                            if (ScanPE5PVB) {
                                logInfo(`Scanner (PE5PVB mode) starts auto-scan automatically [User: ${users}]`);
                                logInfo(`Scanner Tuning Range: ${tuningLowerLimit} MHz - ${tuningUpperLimit} MHz | Sensitivity: "${Sensitivity}" | Scanholdtime: "${ScanHoldTime}"`);
                                sendCommandToClient('J1');
                            } else {
                                logInfo(`Scanner starts auto-scan automatically [User: ${users}]`);
                                logInfo(`Scanner Tuning Range: ${tuningLowerLimit} MHz - ${tuningUpperLimit} MHz | Sensitivity: "${Sensitivity}" | Mode: "${ScannerMode}" | Scanholdtime: "${ScanHoldTime}"`);
                                isScanning = false;
                                AutoScan();
                            }
                                
                            // Reset the scheduling flag
                            autoScanScheduled = false;
                        }
                    }, 10000); // 10000 milliseconds = 10 seconds

                    // Set the scheduling flag to prevent overlapping timeouts
                    autoScanScheduled = true;
                }
            }
            counter = 0; // Reset the counter after processing
        }
    } else if (users > 0) {
        counter = 0;
        if (autoScanActive && StartAutoScan === 'auto') {  // If there are users, auto-scan is active, and StartAutoScan is set to 'auto'
            // Deactivate auto-scan
            autoScanActive = false; 
            Scan = 'off';

            // Create and send a broadcast message to stop the scan
            const Message = createMessage(
                'broadcast',
                '255.255.255.255',
                Scan,
                '',
                Sensitivity,
                ScannerMode,
                ScanHoldTime
            );
            extraSocket.send(JSON.stringify(Message));

            // Log and handle the scan stop based on the mode
            if (ScanPE5PVB) {
                logInfo(`Scanner (PE5PVB mode) stopped automatically auto-scan [User: ${users}]`);
                sendCommandToClient('J0');
            } else {
                logInfo(`Scanner stopped automatically auto-scan [User: ${users}]`);
                stopAutoScan();
            }
            
            if (DefaultFreq !== '' && enableDefaultFreq) {
                sendDataToClient(DefaultFreq);
            }
        }
    }
}



function handleSocketMessage(messageData) {
    const txInfo = messageData.txInfo;

    setTimeout(() => {
        picode = messageData.pi;
		ps = messageData.ps;
        freq = messageData.freq;
        strength = messageData.sig;
        stereo = messageData.st;
		users = messageData.users;
        stereo_forced = messageData.stForced;
		ant = messageData.ant;
        station = messageData.txInfo.tx;
	    pol = messageData.txInfo.pol;
        erp = messageData.txInfo.erp;
        city = messageData.txInfo.city;
        itu = messageData.txInfo.itu;
        distance = messageData.txInfo.dist;
        azimuth = messageData.txInfo.azi;
		stationid = messageData.txInfo.id;
		
        if ((messageData.ps_errors !== "0,0,0,0,0,0,0,1") && (messageData.ps_errors !== "0,0,0,0,0,0,0,0")) {
            ps += "?";
            }
			
		if (isScanning) {
            if (stereo_forced && stereo_forced_user !== 'mono') {
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
            checkStrengthCounter = 0;
            stereo_detect = false;
        }
		
        previousFrequency = freq;
        currentFrequency = freq;
        checkStrengthCounter++;
		
        if (checkStrengthCounter > 3) {
            if (stereo) {
                stereo_detect = true;
            }
        }

        if (!ScanPE5PVB) {
            checkStereo(stereo_detect, freq, strength, picode, station, checkStrengthCounter);
        }

        // Check user count and handle scanning if needed
        checkUserCount(users);

    }, 0);
}


function initializeAntennas(Antennas) {
    try {
        // Check if antennas are enabled
        if (!Antennas.enabled || AntennaSwitch !== 'on') {
            // No antennas enabled
            enabledAntennas = [];
            currentIndex = 0;
            return;
        }

        // Initialize the list of enabled antennas
        enabledAntennas = [];
        for (let i = 1; i <= 4; i++) {
            const antenna = Antennas[`ant${i}`];
            if (antenna && antenna.enabled) {
                enabledAntennas.push({
                    number: i,
                    name: antenna.name
                });
            }
        }

        // Validate the number of enabled antennas
        if (enabledAntennas.length < 2) {
            enabledAntennas = [];
            currentIndex = 0;
            return;
        }

        // Set the current index to 0 if there are valid antennas
        if (enabledAntennas.length > 0) {
            logInfo('Scanner activated automatic antenna switching');
            currentIndex = 0;
        } else {
            currentIndex = 0; // This else is redundant, but kept for clarity
        }
    } catch (error) {
        logError('Scanner Error initializing antennas:', error.message);
    }
}


// Function to send the command to the next activated antenna
function sendNextAntennaCommand() {
    if (enabledAntennas.length < 2 || AntennaSwitch !== 'on') {
        // No need to switch if there's only one or no active antennas
        // console.log('No need to switch antennas.');
        return;
    }

    const ant = enabledAntennas[currentIndex];
    logInfo(`Scanner switched to antenna ${ant.number}: ${ant.name}`);
    sendCommandToClient(`Z${ant.number - 1}`); // Z0 to Z3 for ant1 to ant4

    // Move to the next index
    currentIndex = (currentIndex + 1) % enabledAntennas.length;
}


function AutoScan() {
    if (!isScanning) {
        startScan('up');		// Start scanning once
	}
}

function stopAutoScan() {
	clearInterval(scanInterval); // Stops the scan interval
    isScanning = false;
}

function startScan(direction) {
	clearInterval(scanInterval); // Stops the scan interval
    if (isScanning) {
        return; // Do not start a new scan if one is already running
    }
	
    if (isNaN(currentFrequency) || currentFrequency === 0.0) {
        currentFrequency = tuningLowerLimit;
    }
	


    function updateFrequency() {
        if (!isScanning) {
            // logInfo('Scanning has been stopped.');
            return; // Exit the function if scanning has been stopped
        }

        currentFrequency = Math.round(currentFrequency * 100) / 100; // Round to two decimal place
        if (direction === 'up') {
			if (currentFrequency < '74.00') {
			    currentFrequency += 0.01;
			} else {
				currentFrequency += 0.1;
			}
			console.log(currentFrequency, tuningUpperLimit);
            if (currentFrequency > tuningUpperLimit) {
				if (Scan = 'on') {
				   sendNextAntennaCommand();
				}
                currentFrequency = tuningLowerLimit;
            }
        } else if (direction === 'down') {
			if (currentFrequency < '74.00') {
			    currentFrequency -= 0.01;
			} else {
				currentFrequency -= 0.1;
			}
            if (currentFrequency < tuningLowerLimit) {
                currentFrequency = tuningUpperLimit;
            }
        }

        currentFrequency = Math.round(currentFrequency * 100) / 100; // Round to two decimal place
			
        if (!ScanPE5PVB) {
            if (ScannerMode === 'blacklist' && Scan === 'on') {
                while (isInBlacklist(currentFrequency, blacklist)) {
                    if (direction === 'up') {
						if (currentFrequency < '74.00') {
							currentFrequency += 0.01;
						} else {
							currentFrequency += 0.1;
						}
                        if (currentFrequency > tuningUpperLimit) {
                            currentFrequency = tuningLowerLimit;
                        }
                    } else if (direction === 'down') {
						if (currentFrequency < '74.00') {
							currentFrequency -= 0.01;
						} else {
							currentFrequency -= 0.1;
						}
                        if (currentFrequency < tuningLowerLimit) {
                            currentFrequency = tuningUpperLimit;
                        }
                    }
                    currentFrequency = Math.round(currentFrequency * 100) / 100; // Round to two decimal place
                }
            } else if (ScannerMode === 'whitelist' && Scan === 'on') {			
				if (isInWhitelist(currentFrequency, whitelist)) {
                }
                while (!isInWhitelist(currentFrequency, whitelist)) {				
                    if (direction === 'up') {
						if (currentFrequency < '74.00') {
							currentFrequency += 0.01;
						} else {
							currentFrequency += 0.1;
						}
                        if (currentFrequency > tuningUpperLimit) {
                            currentFrequency = tuningLowerLimit;
                        }
                    } else if (direction === 'down') {
						if (currentFrequency < '74.00') {
							currentFrequency -= 0.01;
						} else {
							currentFrequency -= 0.1;
						}
                        if (currentFrequency < tuningLowerLimit) {
                            currentFrequency = tuningUpperLimit;
                        }
                    }
                    currentFrequency = Math.round(currentFrequency * 100) / 100; // Round to two decimal place
                }
            }
        }

        sendDataToClient(currentFrequency);
		
	}
 
    isScanning = true;
    updateFrequency();
	scanInterval = setInterval(updateFrequency, 500);
}

function isInBlacklist(frequency, blacklist) {
    return blacklist.some(f => Math.abs(f - frequency) < 0.05); // Allow small tolerance for floating-point comparisons
}

function isInWhitelist(frequency, whitelist) {
    return whitelist.some(f => Math.abs(f - frequency) < 0.05); // Allow small tolerance for floating-point comparisons
}

function checkBlacklist() {
    // Determine the path to the file relative to the current directory
    const filePath = path.join(__dirname, '../Scanner/blacklist.txt');

    // Read the file
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            logInfo('Scanner checking Blacklist: not found');
            blacklist = [];
            return;
        }

		blacklist = data.split('\n')
		.map(frequency => frequency.trim())
		.filter(Boolean);

		blacklist = blacklist.map(value => {
		// Check if the value has a decimal point and enough digits
		if (value.includes('.')) {
			return parseFloat(value).toFixed(value.split('.')[1].length);
		}
			return value;
		});
        logInfo('Scanner initialized Blacklist');
    });
}

function checkWhitelist() {
    // Determine the path to the file relative to the current directory
    const filePath = path.join(__dirname, '../Scanner/whitelist.txt');

    // Read the file
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            logInfo('Scanner checking Whitelist: not found');
            whitelist = [];
            return;
        }

		whitelist = data.split('\n')
		.map(frequency => frequency.trim())
		.filter(Boolean);

		whitelist = whitelist.map(value => {
		// Check if the value has a decimal point and enough digits
		if (value.includes('.')) {
			return parseFloat(value).toFixed(value.split('.')[1].length);
		}
			return value;
		});
        logInfo('Scanner initialized Whitelist');
    });
}

       function checkStereo(stereo_detect, freq, strength, picode, station, checkStrengthCounter) {
                                  
			let ScanHoldTimeValue = ScanHoldTime * 10;	
            if (stereo_detect === true || picode.length > 1) {

                if (strength > Sensitivity || picode.length > 1) {					
					// console.log(strength, Sensitivity);

                    if (picode.length > 1 && station === '') {
                        ScanHoldTimeValue += 50;
                    }	
					           
					clearInterval(scanInterval); // Clears a previously defined scanning interval
					isScanning = false; // Updates a flag indicating scanning status	
					

							if ((Savepicode !== picode || Saveps !== ps || Savestationid !== stationid) && picode !== '?') {								
								if (RAWLog) {
									writeCSVLogEntry(false); // activate non filtered log
									writeHTMLLogEntry(false); // activate non filtered log
									Savepicode = picode;
									Saveps = ps;
									Savestationid = stationid;
								}
							}			
								
							if (FilteredLog && Scan !== 'on' && picode.length > 1 && picode !== '?' && !picode.includes('??') && !picode.includes('???') && stationid && freq !== Savefreq) {
								writeCSVLogEntry(true); // filtered log
								writeHTMLLogEntry(true); // filtered log
								Savefreq = freq;
							}
		
							if (Scan === 'on') {
								
								date = new Date().toLocaleDateString();
								time = new Date().toLocaleTimeString();							

							if ((checkStrengthCounter > ScanHoldTimeValue) || (ps.length > 1 && stationid && checkStrengthCounter > ScanHoldTime * 5)) {
									
										if (FilteredLog && picode !== '?' && !picode.includes('??') && !picode.includes('???')) {
											writeCSVLogEntry(true); // filtered log
											writeHTMLLogEntry(true); // filtered log
										}

										startScan('up'); // Restart scanning after the delay
										checkStrengthCounter = 0; // Reset the counter
										stereo_detect = false;
										station = '';								
                                }						
                 			}	
                  
                } else {
					if (Scan === 'on') {
						if (checkStrengthCounter > 10) {
							clearInterval(scanInterval); // Clears a previously defined scanning interval
							stereo_detect = false;
							isScanning = false; // Updates a flag indicating scanning status
							startScan('up');
						}
					}
                }
            } else {
				if (Scan === 'on') {
                    if (checkStrengthCounter > 10) {
                        clearInterval(scanInterval); // Clears a previously defined scanning interval
                        isScanning = false; // Updates a flag indicating scanning status
                        stereo_detect = false;
                        startScan('up');
                    }
				}
            }
        }
		
function getLogFilePathCSV(date, time, isFiltered) {
    // Bestimme den Dateinamen basierend auf dem isFiltered-Flag
    const fileName = isFiltered ? `SCANNER_${date}_filtered.csv` : `SCANNER_${date}.csv`;
    
    // Erstelle den vollständigen Pfad zur Datei
    const filePath = path.join(logDir, fileName);

    // Prüfe, ob der Ordner existiert, wenn nicht, erstelle ihn
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }

    // Prüfe, ob die Datei existiert, wenn nicht, erstelle sie
    if (!fs.existsSync(filePath)) {
         // Update the header content as per your requirements
		let formattedServerDescription = ServerDescription.replace(/\n/g, '\\n'); // Ensure special characters in ServerDescription are handled properly  
		
		let header = `"${ServerName}"\n"${formattedServerDescription}"\n`;
		header += isFiltered ? `SCANNER LOG [FILTER MODE] ${date} ${time}\n\n` : `SCANNER LOG ${date} ${time}\n\n`;
		header += UTCtime ? `date;time(utc);freq;picode;ps;station;city;itu;pol;erp;distance;azimuth;stationid\n` : `date;time;freq;picode;ps;station;city;itu;pol;erp;distance;azimuth;stationid\n`;

		try {
			fs.writeFileSync(filePath, header, { flag: 'w' });
			logInfo('Scanner created /logs/' + fileName);
			stationidAll = '';
		} catch (error) {
			logError('Failed to create /logs/' + fileName, ':', error.message);
		}
    }
	
    return filePath
}

function writeCSVLogEntry(isFiltered) {
	
	if (isInBlacklist(freq, blacklist) && ScannerMode === 'blacklist') {
        return;
    }
	
	if (!isInWhitelist(freq, whitelist) && ScannerMode === 'whitelist') {
        return;
    }

	const now = new Date();
	const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
	let time = now.toTimeString().split(' ')[0]; // HH-MM-SS
	
    // Bestimme den Pfad zur Log-Datei basierend auf dem aktuellen Datum und dem isFiltered-Flag
    const logFilePath = getLogFilePathCSV(date, time, isFiltered);
	
	if (UTCtime) {
		time = getCurrentUTC(); // time in UTC
	}

    // Replace spaces with underscores in the PS string
    let psWithUnderscores = ps.replace(/ /g, '_');

    // Create the log entry line with the relevant data
    let line = `${date};${time};${freq};${picode};${psWithUnderscores};${station};${city};${itu};${pol};${erp};${distance};${azimuth};${stationid}\n`;

    // Check if OnlyFirstLog is true and if the combination of freq, picode, and station already exists
    if (OnlyFirstLog) {
        try {
            // Read the existing log file content
            if (fs.existsSync(logFilePath)) {
                const logContent = fs.readFileSync(logFilePath, 'utf-8');
                
                // Split the log content into lines
                const logLines = logContent.split('\n');

                // Check if any line contains the combination of freq, picode, and station
                const entryExists = logLines.some(logLine => {
                    const columns = logLine.split(';');
                    return columns[2] === freq && columns[3] === picode && columns[5] === station;
                });

                // If the entry exists, do not proceed with writing the new entry
                if (entryExists) {
                    return;
                }
            }
        } catch (error) {
            logError("Failed to read log file:", error.message);
            return;
        }
    }

    try {
        // Append the log entry to the CSV file
        fs.appendFileSync(logFilePath, line, { flag: 'a' });
    } catch (error) {
        logError("Failed to write log entry:", error.message);
    }
}


function getLogFilePathHTML(date, time, isFiltered) {
    // Bestimme den Dateinamen basierend auf dem isFiltered-Flag
    const fileName = isFiltered ? `SCANNER_${date}_filtered.html` : `SCANNER_${date}.html`;
    
    // Erstelle den vollständigen Pfad zur Datei
    const filePath = path.join(logDir, fileName);

    // Prüfe, ob der Ordner existiert, wenn nicht, erstelle ihn
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
	
	if (UTCtime) {
		time = getCurrentUTC(); // time in UTC
	}

	// Check if the file exists; if not, create it
	if (!fs.existsSync(filePath)) {
		let header = '';

		try {
			// Read the contents of the FilteredTemplate.html file
			const templateFilePath = path.join(__dirname, 'FilteredTemplate.html');
			if (fs.existsSync(templateFilePath)) {
				const templateContent = fs.readFileSync(templateFilePath, 'utf8');
				header += templateContent;
			} else {
				logError('FilteredTemplate.html does not exist');
				// Handle the case where the template file is missing
			}
		} catch (error) {
			logError('Failed to read FilteredTemplate.html:', error.message);
		}

		header += `${ServerName}<br>${ServerDescription}<br>`;
		header += isFiltered 
			? `SCANNER LOG [FILTER MODE] ${date} ${time}<br><br>` 
			: `SCANNER LOG ${date} ${time}<br><br>`; 

		header += UTCtime 
			? `<table border="1"><tr><th>DATE</th><th>TIME(UTC)</th><th>FREQ</th><th>PI</th><th>PS</th><th>NAME</th><th>CITY</th><th>ITU</th><th>P</th><th>ERP</th><th>DIST</th><th>AZ</th><th>ID</th><th>FMDX</th><th>FMLIST</th></tr>` 
			: `<table border="1"><tr><th>DATE</th><th>TIME</th><th>FREQ</th><th>PI</th><th>PS</th><th>NAME</th><th>CITY</th><th>ITU</th><th>P</th><th>ERP</th><th>DIST</th><th>AZ</th><th>ID</th><th>FMDX</th><th>FMLIST</th></tr>`;

		try {
			fs.writeFileSync(filePath, header, { flag: 'w' });
			logInfo('Scanner created /logs/' + fileName);
			// Initialize stationidAll if necessary
			stationidAll = '';
		} catch (error) {
			logError('Failed to create /logs/' + fileName, ':', error.message);
		}
	}

    return filePath
}

function writeHTMLLogEntry(isFiltered) {
    
    if (isInBlacklist(freq, blacklist) && ScannerMode === 'blacklist') {
        return;
    }
	
	if (!isInWhitelist(freq, whitelist) && ScannerMode === 'whitelist') {
        return;
    }

    const now = new Date();
    const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
    let time = now.toTimeString().split(' ')[0]; // HH-MM-SS
    
    // Determine the path to the log file based on the current date and the isFiltered flag
    const logFilePath = getLogFilePathHTML(date, time, isFiltered);

    // Initialize stationidAll if necessary
    if (typeof stationidAll === 'undefined' || stationidAll === null) {
        stationidAll = ''; // Initialize as an empty string if undefined
    }

    // Generate dynamic links based on stationid
    let link1 = stationid !== '' ? `<a href="https://maps.fmdx.pl/#qth=${LAT},${LON}&id=${stationid}&findId=*" target="_blank">FMDX</a>` : '';
    let link2 = stationid !== '' && stationid > 0 && FMLIST_OM_ID !== '' ? `<a href="https://www.fmlist.org/fi_inslog.php?lfd=${stationid}&qrb=${distance}&qtf=${azimuth}&country=${itu}&omid=${FMLIST_OM_ID}" target="_blank">FMLIST</a>` : '';

    // Replace spaces with underscores in the PS string
    let psWithUnderscores = ps.replace(/ /g, '_');
    
    if (UTCtime) {
        time = getCurrentUTC(); // time in UTC
    }

    // Create the log entry line with the relevant data
    let line = `<tr><td>${date}</td><td>${time}</td><td>${freq}</td><td>${picode}</td><td>${psWithUnderscores}</td><td>${station}</td><td>${city}</td><td>${itu}</td><td>${pol}</td><td>${erp}</td><td>${distance}</td><td>${azimuth}</td><td>${stationid}</td><td>${link1}</td><td>${link2}</td></tr>\n`;

    // Check if OnlyFirstLog is true and if the combination of freq, picode, and station already exists
    if (OnlyFirstLog) {
        try {
            // Read the existing log file content
            if (fs.existsSync(logFilePath)) {
                const logContent = fs.readFileSync(logFilePath, 'utf-8');

                // Check if any line contains the combination of freq, picode, and station
                const entryExists = logContent.includes(`<td>${freq}</td>`) && logContent.includes(`<td>${picode}</td>`) && logContent.includes(`<td>${station}</td>`);

                // If the entry exists, do not proceed with writing the new entry
                if (entryExists) {
                    return;
                }
            }
        } catch (error) {
            logError("Failed to read log file:", error.message);
            return;
        }
    }

    // Update stationidAll if the current stationid is valid and not already included
    if (stationid !== "" && stationid >= 0) {
        if (!stationidAll.split(',').includes(stationid.toString())) {
            stationidAll += stationidAll ? `,${stationid}` : stationid;
        }
    }

    // Generate the final link including all station IDs
    let finalLink = `https://maps.fmdx.pl/#qth=${LAT},${LON}&id=${stationidAll}&findId=*`;
    let finalLinkHtml = `</table></pre><pre><a href="${finalLink}" target="_blank">FMDX ALL</a></pre></body></html>`;

    try {
        // Read the existing content of the HTML file
        let fileContent = fs.readFileSync(logFilePath, 'utf8');

        // Remove the old final link and closing tags if present
        let updatedContent = fileContent.replace(/<\/table><\/pre><pre><a href="https:\/\/maps\.fmdx\.pl\/#qth=.*<\/a><\/pre><\/body><\/html>/, '');

        // Append the new line and the final link
        updatedContent += line + finalLinkHtml;

        // Write the updated content back to the file
        fs.writeFileSync(logFilePath, updatedContent, 'utf8');
    } catch (error) {
        logError("Failed to update the log file:", error.message);
    }
}

function getCurrentUTC() {
    // Hole die aktuelle Zeit in UTC
    const now = new Date();
    
    // Extrahiere die UTC-Stunden, -Minuten und -Sekunden
    const hours = String(now.getUTCHours()).padStart(2, '0');
    const minutes = String(now.getUTCMinutes()).padStart(2, '0');
    const seconds = String(now.getUTCSeconds()).padStart(2, '0');
    
    // Formatiere die Zeit im HH:MM:SS-Format
    const utcTime = `${hours}:${minutes}:${seconds}`;

    return utcTime;
}
// const { startStopRecording, formatUrl } = require('./airchecker.js');

// let recordingInstance = null;

// async function startRecording() {
    // const websocketBaseUrl = 'http://127.0.0.1:9080';
    // const outputFilename = `${freq}.mp3`;

    // const wsUrlWithAudio = formatUrl(websocketBaseUrl, 'audio');

    // console.log('Starting recording...');
    // recordingInstance = await startStopRecording(wsUrlWithAudio, outputFilename);
// }

// function stopRecording() {
    // if (recordingInstance) {
        // recordingInstance.stop(); // Stelle sicher, dass `stop` die Methode ist, die das Recording stoppt
        // console.log('Recording stopped.');
    // } else {
        // console.log('No recording instance found.');
    // }
// }

InitialMessage();
ExtraWebSocket();
TextWebSocket();
checkBlacklist();
checkWhitelist();

setTimeout(() => {
    initializeAntennas(Antennas);
    sendNextAntennaCommand();;
}, 500);