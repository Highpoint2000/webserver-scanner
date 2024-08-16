///////////////////////////////////////////////////////////////
///                                                         ///
///  SCANNER SERVER SCRIPT FOR FM-DX-WEBSERVER (V2.0)       /// 
///                                                         ///
///                             last update: 16.08.24       ///
///                                                         /// 
///  by Highpoint                                           ///
///  powered by PE5PVB                                      ///     
///                                                         ///
///  https://github.com/Highpoint2000/webserver-scanner     ///
///                                                         ///
///////////////////////////////////////////////////////////////

///  This plugin only works from web server version 1.2.3!!!

const Autoscan_PE5PVB_Mode = false; // Set to "true" if ESP32 with PE5PVB firmware is being used and you want to use the auto scan mode of the firmware
const Search_PE5PVB_Mode = true; // Set to "true" if ESP32 with PE5PVB firmware is being used and you want to use the search mode of the firmware
const StartAutoScan = 'off'; // Set to "off/on/auto" (on - starts with webserver, auto - starts scanning after 10 s when no user is connected)
const AntennaSwitch = 'on';  // Set to "off/on" for automatic switching with more than 1 antenna at the upper band limit

let defaultSensitivityValue = 25; // Value in dBf/dBµV: 5,10,15,20,25,30,35,40,45,50,55,60 | in dBm: -115,-110,-105,-100,-95,-90,-85,-80,-75,-70,-65,-60
let defaultScanHoldTime = 7; // Value in s: 1,3,5,7,1,15,20,30 

// Only valid for Autoscan_PE5PVB_Mode = false 
let defaultScannerMode = 'normal'; // Set the startmode: normal, blacklist, or whitelist

//////////////////////////////////////////////////////////////////////////////////////

const pluginVersion = 'V2.0'; 

const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const { logInfo, logError, logWarn } = require('./../../server/console');
const config = require('./../../config.json');

const ServerName = config.identification.tunerName; 
const DefaultFreq = config.defaultFreq;
const enableDefaultFreq = config.enableDefaultFreq;
const Antennas = config.antennas;
const tuningLowerLimit = config.webserver.tuningLowerLimit;
const tuningUpperLimit = config.webserver.tuningUpperLimit;
const webserverPort = config.webserver.webserverPort || 8080; // Default to port 8080 if not specified
const externalWsUrl = `ws://127.0.0.1:${webserverPort}`;
const ScanPE5PVB = Autoscan_PE5PVB_Mode;
const SearchPE5PVB = Search_PE5PVB_Mode;
const status = '';
const Search = '';
const source = '127.0.0.1';

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
let ant;


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
										logInfo(`Scanner (PE5PVB mode) search down [IP: ${message.source}]`);
									} else {
										startSearch('down');
										logInfo(`Scanner search down [IP: ${message.source}]`);
									}
                                }
                                if (message.value.Search === 'up') {
									if (SearchPE5PVB) {
										sendCommandToClient('C2');
										logInfo(`Scanner (PE5PVB mode) search up [IP: ${message.source}] `);
									} else {
										startSearch('up');
										logInfo(`Scanner search up [IP: ${message.source}]`);
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

function checkUserCount(users) {

    // Check if the conditions for starting the auto-scan are met
    if (users === 0 && !autoScanActive && StartAutoScan === 'auto') {
        if (!autoScanScheduled) {

            // Set a timeout to start auto-scan after 5 seconds
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
            }, 10000); // 10000 milliseconds = 5 seconds

            // Set the scheduling flag to prevent overlapping timeouts
            autoScanScheduled = true;
        }
	}
 
	
    // If there are users, auto-scan is active, and StartAutoScan is set to 'auto'
    if (users > 0 && autoScanActive && StartAutoScan === 'auto') {

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


function handleSocketMessage(messageData) {
    const txInfo = messageData.txInfo;

    let PiCode, freq, strength, stereo, stereo_forced, station;

    setTimeout(() => {
        PiCode = messageData.pi;
        freq = messageData.freq;
        strength = messageData.sig;
        stereo = messageData.st;
		users = messageData.users;
        stereo_forced = messageData.stForced;
        station = txInfo.tx;
		
		ant = messageData.ant;

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
            checkStereo(stereo_detect, freq, strength, PiCode, station, checkStrengthCounter);
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

        currentFrequency = Math.round(currentFrequency * 10) / 10; // Round to one decimal place
		
        if (direction === 'up') {
            currentFrequency += 0.1;
            if (currentFrequency > tuningUpperLimit) {
				if (Scan = 'on') {
				   sendNextAntennaCommand();
				}
                currentFrequency = tuningLowerLimit;
            }
        } else if (direction === 'down') {
            currentFrequency -= 0.1;
            if (currentFrequency < tuningLowerLimit) {
                currentFrequency = tuningUpperLimit;
            }
        }

        currentFrequency = Math.round(currentFrequency * 10) / 10;
			
        if (!ScanPE5PVB) {
            if (ScannerMode === 'blacklist' && Scan === 'on') {
                while (isInBlacklist(currentFrequency, blacklist)) {
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
            } else if (ScannerMode === 'whitelist' && Scan === 'on') {			
				if (isInWhitelist(currentFrequency, whitelist)) {
                }
                while (!isInWhitelist(currentFrequency, whitelist)) {				
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

        blacklist = data.split('\n').map(frequency => frequency.trim()).filter(Boolean);
        blacklist = blacklist.map(value => parseFloat(value).toString());
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

        whitelist = data.split('\n').map(frequency => frequency.trim()).filter(Boolean);
        whitelist = whitelist.map(value => parseFloat(value).toString());
        logInfo('Scanner initialized Whitelist');
    });
}


       function checkStereo(stereo_detect, freq, strength, PiCode, station, checkStrengthCounter) {
                                  
			let ScanHoldTimeValue = ScanHoldTime * 10;	
            if (stereo_detect === true || PiCode.length > 1) {

                if (strength > Sensitivity || PiCode.length > 1) {					
					// console.log(strength, Sensitivity);

                    if (PiCode.length > 1 && station === '') {
                        ScanHoldTimeValue += 50;
                    }	
            
					clearInterval(scanInterval); // Clears a previously defined scanning interval
					isScanning = false; // Updates a flag indicating scanning status		
					
							if (Scan === 'on') {
                                if (checkStrengthCounter > ScanHoldTimeValue) {
																		
										startScan('up'); // Restart scanning after the delay
										checkStrengthCounter = 0; // Reset the counter
										stereo_detect = false;
										station = '';
										startScan('up');
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

InitialMessage();
ExtraWebSocket();
TextWebSocket();
checkBlacklist();
checkWhitelist();

setTimeout(() => {
    initializeAntennas(Antennas);
    sendNextAntennaCommand();;
}, 500);