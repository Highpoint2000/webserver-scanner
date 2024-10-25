///////////////////////////////////////////////////////////////
///                                                         ///
///  SCANNER SERVER SCRIPT FOR FM-DX-WEBSERVER (V2.8)       ///
///                                                         ///
///  by Highpoint               last update: 25.10.24       ///
///  powered by PE5PVB                                      ///
///                                                         ///
///  https://github.com/Highpoint2000/webserver-scanner     ///
///                                                         ///
///////////////////////////////////////////////////////////////

///  This plugin only works from web server version 1.3.1!!!

const https = require('https');
const path = require('path');
const fs = require('fs');
const { logInfo, logError, logWarn } = require('./../../server/console');

// Define the paths to the old and new configuration files
const oldConfigFilePath = path.join(__dirname, 'configPlugin.json');
const newConfigFilePath = path.join(__dirname, './../../plugins_configs/scanner.json');

// Default values for the configuration file
const defaultConfig = {
    Autoscan_PE5PVB_Mode: false,  // Default values as before
    Search_PE5PVB_Mode: false,
    StartAutoScan: 'off',
    AntennaSwitch: 'off',
    defaultSensitivityValue: 30,
    defaultScanHoldTime: 7,
    defaultScannerMode: 'normal',
    FilteredLog: true,
    RAWLog: false,
    OnlyFirstLog: false,
    UTCtime: true,
	EnableBlacklist: false,
	EnableWhitelist: false,
	scanIntervalTime: 500,
	scanBandwith: 0,
	FMLIST_OM_ID: '',
	FMLIST_Autolog: 'off',
	FMLIST_MinDistance: 200,
	FMLIST_MaxDistance: 2000,
	FMLIST_LogInterval: 60
};

// Function to merge default config with existing config and remove undefined values
function mergeConfig(defaultConfig, existingConfig) {
    const updatedConfig = {};

    // Add the existing values that match defaultConfig keys
    for (const key in defaultConfig) {
        updatedConfig[key] = key in existingConfig ? existingConfig[key] : defaultConfig[key];
    }

    return updatedConfig;
}

// Function to load the old config, move it to the new location, and delete the old one
function migrateOldConfig(oldFilePath, newFilePath) {
    if (fs.existsSync(oldFilePath)) {
        // Load the old config
        const oldConfig = JSON.parse(fs.readFileSync(oldFilePath, 'utf-8'));
        
        // Save the old config to the new location
        fs.writeFileSync(newFilePath, JSON.stringify(oldConfig, null, 2), 'utf-8');
        logInfo(`Old config migrated to ${newFilePath}`);

        // Delete the old config file
        fs.unlinkSync(oldFilePath);
        logInfo(`Old config ${oldFilePath} deleted`);
        
        return oldConfig;
    }

    return null;  // No old config found
}

// Function to load or create the configuration file
function loadConfig(filePath) {
    let existingConfig = {};

    // Ensure the directory exists
    const dirPath = path.dirname(filePath);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        logInfo(`Directory created: ${dirPath}`);
    }

    // Try to migrate the old config if it exists
    const migratedConfig = migrateOldConfig(oldConfigFilePath, filePath);
    if (migratedConfig) {
        existingConfig = migratedConfig;
    } else {
        // Check if the new configuration file exists
        if (fs.existsSync(filePath)) {
            // Read the existing configuration file
            existingConfig = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        } else {
            logInfo('Scanner configuration not found. Creating scanner.json.');
        }
    }

    // Merge the default config with the existing one, adding missing fields and removing undefined
    const finalConfig = mergeConfig(defaultConfig, existingConfig);

    // Write the updated configuration back to the file (if changes were made)
    fs.writeFileSync(filePath, JSON.stringify(finalConfig, null, 2), 'utf-8');

    return finalConfig;
}


// Load or create the configuration file
const configPlugin = loadConfig(newConfigFilePath);

// Zugriff auf die Variablen wie bisher
const Autoscan_PE5PVB_Mode = configPlugin.Autoscan_PE5PVB_Mode;
const Search_PE5PVB_Mode = configPlugin.Search_PE5PVB_Mode;
const StartAutoScan = configPlugin.StartAutoScan;
const AntennaSwitch = configPlugin.AntennaSwitch;

const defaultSensitivityValue = configPlugin.defaultSensitivityValue;
const defaultScanHoldTime = configPlugin.defaultScanHoldTime;
const defaultScannerMode = configPlugin.defaultScannerMode;

const FilteredLog = configPlugin.FilteredLog;
const RAWLog = configPlugin.RAWLog;
const OnlyFirstLog = configPlugin.OnlyFirstLog;
const UTCtime = configPlugin.UTCtime;
  let FMLIST_OM_ID = configPlugin.FMLIST_OM_ID;
const EnableBlacklist = configPlugin.EnableBlacklist;
const EnableWhitelist = configPlugin.EnableWhitelist;
const scanIntervalTime = configPlugin.scanIntervalTime;
const scanBandwith = configPlugin.scanBandwith;
const FMLIST_Autolog = configPlugin.FMLIST_Autolog;
  let FMLIST_MinDistance = configPlugin.FMLIST_MinDistance;
  let FMLIST_MaxDistance = configPlugin.FMLIST_MaxDistance;
  let FMLIST_LogInterval = configPlugin.FMLIST_LogInterval;

// Path to the target JavaScript file
const ScannerClientFile = path.join(__dirname, 'scanner.js');

// Function to start the process
function updateSettings() {
  // Read the target file
  fs.readFile(ScannerClientFile, 'utf8', (err, targetData) => {
    if (err) {
      logError('Error reading the scanner.js file:', err);
      return;
    }

    // Check if the variables EnableBlacklist and EnableWhitelist already exist
    let hasEnableBlacklist = /const EnableBlacklist = .+;/.test(targetData);
    let hasEnableWhitelist = /const EnableWhitelist = .+;/.test(targetData);

    // Replace or add the definitions
    let updatedData = targetData;

    if (hasEnableBlacklist) {
      updatedData = updatedData.replace(/const EnableBlacklist = .*;/, `const EnableBlacklist = ${EnableBlacklist};`);
    } else {
      // If EnableBlacklist does not exist, add it at the beginning
      updatedData = `const EnableBlacklist = ${EnableBlacklist};\n` + updatedData;
    }

    if (hasEnableWhitelist) {
      updatedData = updatedData.replace(/const EnableWhitelist = .*;/, `const EnableWhitelist = ${EnableWhitelist};`);
    } else {
      // If EnableWhitelist does not exist, add it at the beginning
      updatedData = `const EnableWhitelist = ${EnableWhitelist};\n` + updatedData;
    }

    // Update/write the target file
    fs.writeFile(ScannerClientFile, updatedData, 'utf8', (err) => {
      if (err) {
        logError('Error writing to the scanner.js file:', err);
        return;
      }
      logInfo('Scanner.js file successfully updated');
    });
  });
}

// Start the process
updateSettings();

////////////////////////////////////////////////////////////////

const WebSocket = require('ws');
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
let DataPluginsSocket;
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
let StatusFMLIST = FMLIST_Autolog;
let Scan;
let enabledAntennas = [];
let currentIndex = 0;
let picode, Savepicode, ps, Saveps, Prevps, freq, Savefreq, strength, stereo, stereo_forced, ant, bandwith, station, pol, erp, city, itu, distance, azimuth, stationid, Savestationid, tp, ta, af;
let CSV_LogfilePath;
let CSV_LogfilePath_filtered;
let HTML_LogfilePath;
let HTML_LogfilePath_filtered;
let tuningLowerLimit = config.webserver.tuningLowerLimit;
let tuningUpperLimit = config.webserver.tuningUpperLimit;
let tuningLimit = config.webserver.tuningLimit;
let textSocketLost;
let scanBandwithSave;

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

if (!FMLIST_OM_ID) {
	FMLIST_OM_ID = config.extras.fmlistOmid;
}


// Create a status message object
function createMessage(status, target, Scan, Search, Sensitivity, ScannerMode, ScanHoldTime, StatusFMLIST, InfoFMLIST) {
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
			ScanHoldTime: ScanHoldTime,
            StatusFMLIST: StatusFMLIST,
			InfoFMLIST: InfoFMLIST
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
					if (Scan === 'on' && Autoscan_PE5PVB_Mode) {
						sendCommandToClient('J1');
						logInfo(`Scanner Tuning Range: ${tuningLowerLimit} MHz - ${tuningUpperLimit} MHz | Sensitivity: "${Sensitivity}" | Scanholdtime: "${ScanHoldTime}"`);
					}
                } else {
                    logInfo(`Scanner set auto-scan "${StartAutoScan}" sensitivity "${defaultSensitivityValue}" mode "${defaultScannerMode}" scanholdtime "${defaultScanHoldTime}"`);
					if (Scan === 'on') {
						logInfo(`Scanner Tuning Range: ${tuningLowerLimit} MHz - ${tuningUpperLimit} MHz | Sensitivity: "${Sensitivity}" | Mode: "${ScannerMode}" | Scanholdtime: "${ScanHoldTime}"`);
					}
                }

                textSocket.onmessage = (event) => {
                    try {
                        // Parse the incoming message data
                        const messageData = JSON.parse(event.data);
						// console.log(messageData);

                        if (!isSerialportAlive || isSerialportRetrying) {
                          if (textSocketLost) {
                            clearTimeout(textSocketLost);
                          }

                          textSocketLost = setTimeout(() => {
                            // WebSocket reconnection required after serialport connection loss
                            logInfo("Scanner connection lost, creating new WebSocket.");
                            if (textSocket) {
                              try {
                                textSocket.close(1000, 'Normal closure');
                              } catch (error) {
                                logInfo("Error closing WebSocket:", error);
                              }
                            }
                            textSocketLost = null;
                          }, 10000);
                        }

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

async function DataPluginsWebSocket() {
    if (!DataPluginsSocket || DataPluginsSocket.readyState === WebSocket.CLOSED) {
        try {
            DataPluginsSocket = new WebSocket(externalWsUrl + '/data_plugins');

            DataPluginsSocket.onopen = () => {
                logInfo(`Scanner connected to ${externalWsUrl + '/data_plugins'}`);
            };

            DataPluginsSocket.onerror = (error) => {
                logError("WebSocket error:", error);
            };

            DataPluginsSocket.onclose = () => {
                logInfo("Scanner WebSocket closed.");
                setTimeout(DataPluginsWebSocket, 1000); // Increased delay for reconnection
            };
			
            DataPluginsSocket.onmessage = (event) => {
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
                                    ScanHoldTime,
									FMLIST_Autolog
                                );

                                // Send the response message
                                DataPluginsSocket.send(JSON.stringify(responseMessage));
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
								if (message.value.ScannerMode !== undefined && message.value.ScannerMode === 'blacklist' && EnableBlacklist) {
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
											ScanHoldTime,
											FMLIST_Autolog
										);
								
										DataPluginsSocket.send(JSON.stringify(responseMessage));
									}
								}
								if (message.value.ScannerMode !== undefined && message.value.ScannerMode === 'whitelist' && EnableWhitelist) {
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
											ScanHoldTime,
											FMLIST_Autolog
										);
								
										DataPluginsSocket.send(JSON.stringify(responseMessage));
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
									FMLIST_Autolog
                                );
								
                                if (message.value.Scan === 'on' && Scan === 'off') {
					
									Scan = message.value.Scan;
									DataPluginsSocket.send(JSON.stringify(responseMessage));
									
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
									DataPluginsSocket.send(JSON.stringify(responseMessage));
									
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
            setTimeout(DataPluginsWebSocket, 1000); // Increased delay for reconnection
        }
    }
}

function InitialMessage() {
    const ws = new WebSocket(externalWsUrl + '/data_plugins');
    ws.on('open', () => {
        // logInfo(`Scanner connected to ${ws.url}`);	
        ws.send(JSON.stringify(createMessage('broadcast', '255.255.255.255', 'off', 'off', defaultSensitivityValue, defaultScannerMode, defaultScanHoldTime, FMLIST_Autolog))); // Send initial status
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

function StatusInfoFMLIST() {
	if (FMLIST_Autolog === 'on') {
		logInfo(`Scanner activated FMLIST Logging "all mode" with ${FMLIST_MinDistance} km < Distance < ${FMLIST_MaxDistance} km and ${FMLIST_LogInterval} Min. Interval`);
	} else if (FMLIST_Autolog === 'auto') {
		logInfo(`Scanner activated FMLIST Logging with "auto mode" with ${FMLIST_MinDistance} km < Distance < ${FMLIST_MaxDistance} km and ${FMLIST_LogInterval} Min. Interval`);
	}
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
                            ScanHoldTime,
							FMLIST_Autolog
                        );

                        if (users === 0) {
                            DataPluginsSocket.send(JSON.stringify(Message));

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
                ScanHoldTime,
				FMLIST_Autolog
            );
            DataPluginsSocket.send(JSON.stringify(Message));

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

// Variable to cache the file content
let cachedData = null;

async function fetchstationid(freq, picode, city) {
    try {
        // Check if data is already cached
        if (!cachedData) {
            // Fetch the content from the specified URL if not cached
            const response = await fetch("https://tef.noobish.eu/logos/scripts/StationID_PL.txt");

            // Check if the response is successful
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Read the text content from the response
            cachedData = await response.text();
        } else {
            // logInfo('Scanner Info: Using cached data.');
        }

        // Remove the period from freq
        const cleanedFreq = freq.replace('.', '');

        // Remove all special characters from city and convert to lowercase
        const cleanedCity = city.replace(/[^a-z]/gi, '').toLowerCase();

        // Extract the first four characters of the cleaned city
        const cityPrefix = cleanedCity.substring(0, 3);

        // Create a pattern with wildcards around each of the first four characters of the cleaned city
        const cityPattern = cityPrefix
            .split('')
            .map(char => `.*${char}`)
            .join('');
        
        // Build the target string based on the provided variables with wildcards
        const targetString = `${cleanedFreq};${picode};${cityPattern}.*`;
        // logInfo(`Scanner Info: Searching for specified combination: ${targetString}`);

        // Create a case-insensitive regular expression to match the target string
        const regex = new RegExp(targetString, 'i');

        // Find the line that matches the target regex
        const targetLine = cachedData.split('\n').find(line => regex.test(line));

        if (targetLine) {
            // Split the line by semicolons to get all the parts
            const parts = targetLine.split(';');

            // Extract and clean the station ID from the last column
            let StationID = parts[parts.length - 1].trim();

            // Further cleaning can be done here if needed (e.g., removing specific characters)
            StationID = StationID.replace(/[^0-9]/g, ''); // Example: remove all non-alphanumeric characters

            // logInfo(`Station ID: ${StationID}`);
            return StationID;
        } else {
            // logInfo(`Scanner Info: The specified combination of ${cleanedFreq};*${picode}*;*${cityPattern}* was not found in the stationid_PL.txt.`);
            return null;
        }
    } catch (error) {
        logError('Scanner Error:', error);
        return null;
    }
}


async function handleSocketMessage(messageData) {
    const txInfo = messageData.txInfo;

    // Now you don't need to use setTimeout, unless you need an explicit delay
    picode = messageData.pi;
    ps = messageData.ps;
    freq = messageData.freq;
    strength = messageData.sig;
    stereo = messageData.st;
	bandwith = messageData.bw;
    users = messageData.users;
    stereo_forced = messageData.stForced;
    ant = messageData.ant;
	ta = messageData.ta;
	tp = messageData.tp;
	af = messageData.af;
    station = messageData.txInfo.tx;
    pol = messageData.txInfo.pol;
    erp = messageData.txInfo.erp;
    city = messageData.txInfo.city;
    itu = messageData.txInfo.itu;
    distance = messageData.txInfo.dist;
    azimuth = messageData.txInfo.azi;
	
	if (bandwith === "-1") {
		bandwith = "0";
	}
	
	if (bandwith === -1) {
		bandwith = 0;
	}
	   
    // Determine station ID for Polish stations
    if (itu === "POL") {
        stationid = await fetchstationid(freq, picode, city); 
	} else {
        stationid = messageData.txInfo.id;
    }
    
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
    } else {
		PE5PVBlog(freq, picode, station, checkStrengthCounter)
	}

    // Check user count and handle scanning if needed
    checkUserCount(users);
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
		if (scanBandwith === '0' || scanBandwith === 0) {
			if (bandwith !== '0' && bandwith !== 0) {
				logInfo('Scanner set bandwith from:', bandwith, 'kHz to: auto mode');
			}
		} else {
			if (bandwith === '0' || bandwith === 0) {
				logInfo('Scanner set bandwith from: auto mode to:', scanBandwith,  'kHz');
			} else {
				logInfo('Scanner set bandwith from:', bandwith, 'kHz to:', scanBandwith,  'kHz');
			}
		}
		scanBandwithSave = bandwith;
		textSocket.send(`W${scanBandwith}\n`);
        startScan('up');		// Start scanning once
	}
}

function stopAutoScan() {
	clearInterval(scanInterval); // Stops the scan interval
	if (scanBandwithSave === '0' || scanBandwithSave === 0) {
		if (scanBandwith !== '0' && scanBandwith !== 0) {
			logInfo('Scanner set bandwith from:', scanBandwith, 'kHz back to: auto mode');
		}			
	} else {
		if (scanBandwith === '0' || scanBandwith === 0) {
			logInfo('Scanner set bandwith from: auto mode back to:', scanBandwithSave, 'kHz');
		}		
	}
	textSocket.send(`W${scanBandwithSave}\n`);
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
            logInfo('Scanning has been stopped.');
            return; // Exit the function if scanning has been stopped
        }
		
        currentFrequency = Math.round(currentFrequency * 100) / 100; // Round to two decimal place
        if (direction === 'up') {
			if (currentFrequency < '74.00') {
			    currentFrequency += 0.01;
			} else {
				currentFrequency += 0.1;
			}
            if (currentFrequency > tuningUpperLimit) {
				if (Scan === 'on') {
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
            if (ScannerMode === 'blacklist' && Scan === 'on' && EnableBlacklist) {
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
						
				
            } else if (ScannerMode === 'whitelist' && Scan === 'on' && EnableWhitelist) {			
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
	scanInterval = setInterval(updateFrequency, scanIntervalTime);
}

function isInBlacklist(frequency, blacklist) {
    return blacklist.some(f => Math.abs(f - frequency) < 0.05); // Allow small tolerance for floating-point comparisons
}

function isInWhitelist(frequency, whitelist) {
    return whitelist.some(f => Math.abs(f - frequency) < 0.05); // Allow small tolerance for floating-point comparisons
}

function checkBlacklist() {
	
    if (!EnableBlacklist) {
        logInfo('Blacklist is not enabled. Skipping check.');
        return;
    }
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
    // Check if the whitelist feature is enabled
    if (!EnableWhitelist) {
        logInfo('Whitelist is not enabled. Skipping check.');
        return;
    }
	
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

							if (RAWLog && (Savepicode !== picode || Saveps !== ps || Savestationid !== stationid) && picode !== '?') {								
									writeCSVLogEntry(false); // activate non filtered log
									writeHTMLLogEntry(false); // activate non filtered log
									Savepicode = picode;
									Saveps = ps;
									Savestationid = stationid;
							}			
		
							if (Scan === 'on') {
								
								date = new Date().toLocaleDateString();
								time = new Date().toLocaleTimeString();							

								if (((checkStrengthCounter > ScanHoldTimeValue) || (ps.length > 1 && stationid && checkStrengthCounter > ScanHoldTime * 5)) ) {
									
										if (FilteredLog && picode !== '?' && !picode.includes('??') && !picode.includes('???') && freq !== Savefreq) {
											writeCSVLogEntry(true); // filtered log
											writeHTMLLogEntry(true); // filtered log
											
											if (FMLIST_Autolog === 'on' || FMLIST_Autolog === 'auto') {
												writeLogFMLIST(); 
											}
												
										}
										
										isScanning = false; 									
										checkStrengthCounter = 0; // Reset the counter
										stereo_detect = false;
										station = '';	
										Savefreq = freq;	
										startScan('up'); // Restart scanning after the delay
									
                                } 
								
                 			} else {
								
								if (FilteredLog && picode.length > 1 && picode !== '?' && !picode.includes('??') && !picode.includes('???') && stationid && freq !== Savefreq) {
									writeCSVLogEntry(true); // filtered log
									writeHTMLLogEntry(true); // filtered log
									if (FMLIST_Autolog === 'on') {
										writeLogFMLIST(); 
									}
									Savefreq = freq;
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
		
      function PE5PVBlog(freq, picode, station, checkStrengthCounter) {
		  
			let ScanHoldTimeValue = ScanHoldTime * 6;	
		                                  
            if (picode.length > 1) {

							if ((Savepicode !== picode || Saveps !== ps || Savestationid !== stationid) && picode !== '?') {						
								if (RAWLog) {
									writeCSVLogEntry(false); // activate non filtered log
									writeHTMLLogEntry(false); // activate non filtered log
									Savepicode = picode;
									Saveps = ps;
									Savestationid = stationid;
								}
							}			

							if (Scan === 'on') {
								
								date = new Date().toLocaleDateString();
								time = new Date().toLocaleTimeString();						

								if (FilteredLog && ps.length > 1 && !ps.includes('?') && picode.length > 1 && picode !== '?' && !picode.includes('??') && !picode.includes('???') && stationid && freq !== Savefreq || checkStrengthCounter > ScanHoldTimeValue && freq !== Savefreq) {
											writeCSVLogEntry(true); // filtered log
											writeHTMLLogEntry(true); // filtered log
											
											if (FMLIST_Autolog === 'on' || FMLIST_Autolog === 'auto') {
												writeLogFMLIST(); 
											}
											
											Savefreq = freq;	
								}

								station = '';	
																
                 			} else {
								
								if (FilteredLog && ps.length > 1 && !ps.includes('?') && picode.length > 1 && picode !== '?' && !picode.includes('??') && !picode.includes('???') && stationid && freq !== Savefreq || checkStrengthCounter > ScanHoldTimeValue && freq !== Savefreq) {
									writeCSVLogEntry(true); // filtered log
									writeHTMLLogEntry(true); // filtered log
									
									if (FMLIST_Autolog === 'on') {
												writeLogFMLIST(); 
										}
									
									Savefreq = freq;
								}
							}								              
            }
        }
		
function getLogFilePathCSV(date, time, isFiltered) {
    
    if (UTCtime) {
        const { utcDate, utcTime } = getCurrentUTC(); // time in UTC
        time = utcTime;
        date = utcDate;
    }
    
    // Determine the filename based on the isFiltered flag
    const fileName = isFiltered ? `SCANNER_${date}_filtered.csv` : `SCANNER_${date}.csv`;
    
    // Create the full path to the file
    const filePath = path.join(logDir, fileName);

    // Check if the directory exists, if not, create it
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }

    // Check if the file exists, if not, create it
    if (!fs.existsSync(filePath)) {
         // Update the header content as per your requirements
        let formattedServerDescription = ServerDescription.replace(/\n/g, '\\n'); // Ensure special characters in ServerDescription are handled properly  
        
        let header = `"${ServerName}"\n"${formattedServerDescription}"\n`;
        
		if (OnlyFirstLog) {
			if (UTCtime) {
				header += isFiltered ? `SCANNER LOG (FILTER MODE - FIRST LOG) ${date} ${time} (UTC)\n` : `SCANNER LOG (FIRST LOG) ${date} ${time} (UTC)\n`; 
			} else {
				header += isFiltered ? `SCANNER LOG (FILTER MODE - FIRST LOG) ${date} ${time}\n` : `SCANNER LOG (FIRST LOG) ${date} ${time}\n`; 
			}
		} else {
			if (UTCtime) {
				header += isFiltered ? `SCANNER LOG (FILTER MODE) ${date} ${time} (UTC)\n` : `SCANNER LOG ${date} ${time} (UTC)\n`; 
			} else {
				header += isFiltered ? `SCANNER LOG (FILTER MODE) ${date} ${time}\n` : `SCANNER LOG ${date} ${time}\n`; 
			}
		}
                    
        header += UTCtime ? `date;time(utc);freq;picode;ps;station;city;itu;pol;erp;strength;distance;azimuth;stationid\n` : `date;time;freq;picode;ps;station;city;itu;pol;erp;strength;distance;azimuth;stationid\n`;

        try {
            fs.writeFileSync(filePath, header, { flag: 'w' });
            logInfo('Scanner created /logs/' + fileName);
        } catch (error) {
            logError('Failed to create /logs/' + fileName, ':', error.message);
        }
    }
    
    return filePath;
}

function writeCSVLogEntry(isFiltered) {
    
    if (isInBlacklist(freq, blacklist) && ScannerMode === 'blacklist' && !ScanPE5PVB && EnableBlacklist) {
        return;
    }
    
    if (!isInWhitelist(freq, whitelist) && ScannerMode === 'whitelist' && !ScanPE5PVB && EnableWhitelist) {
        return;
    }

    const now = new Date();
    let date = now.toISOString().split('T')[0]; // YYYY-MM-DD
    let time = now.toTimeString().split(' ')[0]; // HH-MM-SS
    
    if (UTCtime) {
        const { utcDate, utcTime } = getCurrentUTC(); // time in UTC
        time = utcTime;
        date = utcDate;
    }
    
    // Determine the path to the log file based on the current date and the isFiltered flag
    const logFilePath = getLogFilePathCSV(date, time, isFiltered);
    
    // Replace spaces with underscores in the PS string
    let psWithUnderscores = ps.replace(/ /g, '_');

    // Create the log entry line with the relevant data
    let line = `${date};${time};${freq};${picode};${psWithUnderscores};${station};${city};${itu};${pol};${erp};${strength};${distance};${azimuth};${stationid}\n`;

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
    if (UTCtime) {
        const { utcDate, utcTime } = getCurrentUTC(); // time in UTC
        time = utcTime;
        date = utcDate;
    }
    
    // Determine the filename based on the isFiltered flag
    const fileName = isFiltered ? `SCANNER_${date}_filtered.html` : `SCANNER_${date}.html`;
    
    // Create the full path to the file
    const filePath = path.join(logDir, fileName);

    // Check if the directory exists, if not, create it
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
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
        
		if (OnlyFirstLog) {
			if (UTCtime) {
				header += isFiltered ? `SCANNER LOG (FILTER MODE - FIRST LOG) ${date} ${time} (UTC)<br><br>` : `SCANNER LOG (FIRST LOG) ${date} ${time} (UTC)<br><br>`; 
			} else {
				header += isFiltered ? `SCANNER LOG (FILTER MODE - FIRST LOG) ${date} ${time}<br><br>` : `SCANNER LOG (FIRST LOG) ${date} ${time}<br><br>`; 
			}
		} else {
			if (UTCtime) {
				header += isFiltered ? `SCANNER LOG (FILTER MODE) ${date} ${time} (UTC)<br><br>` : `SCANNER LOG ${date} ${time} (UTC)<br><br>`; 
			} else {
				header += isFiltered ? `SCANNER LOG (FILTER MODE) ${date} ${time}<br><br>` : `SCANNER LOG ${date} ${time}<br><br>`; 
			}
		}

        header += UTCtime 
            ? `<table border="1"><tr><th>DATE</th><th>TIME(UTC)</th><th>FREQ</th><th>PI</th><th>PS</th><th>NAME</th><th>CITY</th><th>ITU</th><th>P</th><th>ERP</th><th>STRENGTH</th><th>DIST</th><th>AZ</th><th>ID</th><th>STREAM</th><th>MAP</th><th>FMLIST</th></tr>\n` 
            : `<table border="1"><tr><th>DATE</th><th>TIME</th><th>FREQ</th><th>PI</th><th>PS</th><th>NAME</th><th>CITY</th><th>ITU</th><th>P</th><th>ERP</th><th>STRENGTH</th><th>DIST</th><th>AZ</th><th>ID</th><th>STREAM</th><th>MAP</th><th>FMLIST</th></tr>\n`;

        try {
            fs.writeFileSync(filePath, header, { flag: 'w' });
            logInfo('Scanner created /logs/' + fileName);
        } catch (error) {
            logError('Failed to create /logs/' + fileName, ':', error.message);
        }
    }

    return filePath;
}

function writeHTMLLogEntry(isFiltered) {
    if (isInBlacklist(freq, blacklist) && ScannerMode === 'blacklist' && !ScanPE5PVB && EnableBlacklist) {
        return;
    }

    if (!isInWhitelist(freq, whitelist) && ScannerMode === 'whitelist' && !ScanPE5PVB && EnableWhitelist) {
        return;
    }

    const now = new Date();
    let date = now.toISOString().split('T')[0]; // YYYY-MM-DD
    let time = now.toTimeString().split(' ')[0]; // HH-MM-SS

    if (UTCtime) {
        const { utcDate, utcTime } = getCurrentUTC(); // time in UTC
        time = utcTime;
        date = utcDate;
    }

    const logFilePath = getLogFilePathHTML(date, time, isFiltered);

	let link1 = stationid !== '' ? `<a href="#" onclick="window.open('https://fmscan.org/stream.php?i=${stationid}', 'newWindow', 'width=800,height=160'); return false;" target="_blank">STREAM</a>` : '';
    let link2 = stationid !== '' ? `<a href="https://maps.fmdx.org/#qth=${LAT},${LON}&id=${stationid}&findId=*" target="_blank">MAP</a>` : '';
    let link3 = stationid !== '' && stationid > 0 && FMLIST_OM_ID !== '' ? `<a href="https://www.fmlist.org/fi_inslog.php?lfd=${stationid}&qrb=${distance}&qtf=${azimuth}&country=${itu}&omid=${FMLIST_OM_ID}" target="_blank">FMLIST</a>` : '';


    let psWithUnderscores = ps.replace(/ /g, '_');

    let line = `<tr><td>${date}</td><td>${time}</td><td>${freq}</td><td>${picode}</td><td>${psWithUnderscores}</td><td>${station}</td><td>${city}</td><td>${itu}</td><td>${pol}</td><td>${erp}</td><td>${strength}</td><td>${distance}</td><td>${azimuth}</td><td>${stationid}</td><td>${link1}</td><td>${link2}</td><td>${link3}</td></tr>\n`;

    let logContent = '';
    if (fs.existsSync(logFilePath)) {
        try {
            logContent = fs.readFileSync(logFilePath, 'utf8');
        } catch (error) {
            logError("Failed to read log file:", error.message);
            return;
        }
    }

    if (OnlyFirstLog) {
        const entryExists = logContent.includes(`<td>${freq}</td>`) && logContent.includes(`<td>${picode}</td>`) && logContent.includes(`<td>${station}</td>`);
        if (entryExists) {
            return;
        }
    }

    // Ensure the log ends correctly for every entry
    const endTag = '</pre></body></html>';
    let updatedContent = logContent.replace(new RegExp(`${endTag}$`), '');

    // Add the new line
    updatedContent += line;

    // Append the end tag after the last entry
    updatedContent += endTag;

    try {
        fs.writeFileSync(logFilePath, updatedContent, 'utf8');
    } catch (error) {
        logError("Failed to update the log file:", error.message);
    }
}

function getCurrentUTC() {
    // Get the current time in UTC
    const now = new Date();
    
    // Extract the UTC year, month, and day
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0'); // Month is zero-based
    const day = String(now.getUTCDate()).padStart(2, '0');
    
    // Extract the UTC hours, minutes, and seconds
    const hours = String(now.getUTCHours()).padStart(2, '0');
    const minutes = String(now.getUTCMinutes()).padStart(2, '0');
    const seconds = String(now.getUTCSeconds()).padStart(2, '0');
    
    // Format the date and time
    const utcDate = `${year}-${month}-${day}`;
    const utcTime = `${hours}:${minutes}:${seconds}`;

    // Return an object with date and time
    return { utcDate, utcTime };
}

const logHistory = {};

// Funktion, um zu überprüfen, ob die ID in den letzten 60 Minuten protokolliert wurde
function canLog(stationid) {
    const now = Date.now();
	if (FMLIST_LogInterval < 60 || FMLIST_LogInterval === '' || FMLIST_LogInterval === undefined) {
		FMLIST_LogInterval = 60
	}
    const sixtyMinutes = 60 * FMLIST_LogInterval * 1000; // 60 Minuten in Millisekunden
    if (logHistory[stationid] && (now - logHistory[stationid]) < sixtyMinutes) {
        return false; // Protokollierung verweigern, wenn weniger als 60 Minuten vergangen sind
    }
    logHistory[stationid] = now; // Aktualisiere mit dem aktuellen Zeitstempel
    return true;
}

function writeLogFMLIST() {
	
	if (FMLIST_MinDistance < 150 || FMLIST_MinDistance === '' || FMLIST_MinDistance === undefined) {
		FMLIST_MinDistance = 150
	}
	
	if (FMLIST_MaxDistance < 150 || FMLIST_MaxDistance === '' || FMLIST_MaxDistance === undefined) {
		FMLIST_MaxDistance = 2000
	}
	
	// Check if distance is within the specified minimum and maximum limits
	if (distance < FMLIST_MinDistance || distance > FMLIST_MaxDistance) {
		return; // Exit the function if the distance is out of range
	}
	
	// Ensure that a station ID is provided
	if (!stationid) {
        return; // Exit if station ID is missing
    }
    
	const FMLISTlog = `Scanner FMLIST Log ${station}[${itu}] from ${city}[${distance} km] on ${freq} MHz`
	
	// Check if logging can proceed for the given station ID
    if (!canLog(stationid)) {
		logInfo(`${FMLISTlog} was already logged recently`);
		// Create and send a broadcast message
		const Message = createMessage(
			'broadcast', // Message type
			'255.255.255.255', // Broadcast IP address
			'', // Placeholder for additional fields
			'',
			'',
			'',
			'',
			FMLIST_Autolog, // Auto-log flag
			`FMLIST Log failed! ID${stationid} was already logged recently.` // Message content
			);
		DataPluginsSocket.send(JSON.stringify(Message)); // Send the broadcast message
		return; // Exit if the station was logged recently
	}
			
	// Safely handle the signal strength value
    let signalValue = strength; // Retrieve the signal strength

    // Check if signalValue is not a number, and attempt to convert it
    if (typeof signalValue !== 'number') {
        signalValue = parseFloat(signalValue); // Convert to float if it's not a number
    }

    // If signalValue is still not a number, handle the error
    if (isNaN(signalValue)) {
        console.log('Signal value is not a valid number:', dataHandler.sig); // Log an error message
        return; // Exit the function if the value is invalid
    }
	
	// Prepare the data to be sent in the POST request
    const postData = JSON.stringify({
        station: {
            freq: freq, // Frequency of the station
            pi: picode, // PI code of the station
            id: stationid, // ID of the station
            rds_ps: ps.replace(/'/g, "\\'"), // Escape single quotes in the station name
            signal: signalValue, // Use the validated signal value
            tp: tp, // Transport type
            ta: ta, // Traffic announcement
            af_list: af, // Alternate frequency list
        },
			
        server: {
            uuid: config.identification.token, // Unique identifier for the server
            latitude: config.identification.lat, // Latitude of the server
            longitude: config.identification.lon, // Longitude of the server
            address: config.identification.proxyIp.length > 1 ? config.identification.proxyIp : ('Matches request IP with port ' + config.webserver.port), // Proxy IP or request IP with port
            webserver_name: config.identification.tunerName.replace(/'/g, "\\'"), // Escape single quotes in the web server name
            omid: FMLIST_OM_ID, // OM ID for FMLIST
        },
        log_msg: `Logged PS: ${ps.replace(/\s+/g, '_')}, PI: ${picode}, Signal: ${signalValue.toFixed(0)} dBf`, // Log message including station name, PI, and signal strength
    });

    // Define the options for the HTTPS request
    const options = {
        hostname: 'api.fmlist.org', // API hostname
        path: '/fmdx.org/slog.php', // API path
        method: 'POST', // HTTP method
        headers: {
            'Content-Type': 'application/json', // Content type of the request
            'Content-Length': Buffer.byteLength(postData) // Use Buffer.byteLength for accurate content length
        }
    };

    // Create the HTTPS request
    const request = https.request(options, (response) => {
        let data = '';

        // Collect response data chunks
        response.on('data', (chunk) => {
            data += chunk; // Append each chunk to the data variable
        });

        // Handle the end of the response
        response.on('end', () => {
			if (data.includes('OK!')) { // Check if the response contains 'OK!'
				logInfo(`${FMLISTlog} successful`);
				// Create and send a broadcast message
				const Message = createMessage(
					'broadcast', // Message type
					'255.255.255.255', // Broadcast IP address
					'', // Placeholder for additional fields
					'',
					'',
					'',
					'',
					FMLIST_Autolog, // Auto-log flag
					`FMLIST Log successful.` // Message content
				);
				DataPluginsSocket.send(JSON.stringify(Message)); // Send the broadcast message
			}
        });
    });

    // Handle errors in the request
    request.on('error', (error) => {
        logError('Scanner Log to FMLIST:', error); // Log the error
    });

    // Write the postData to the request and end it properly
    request.write(postData);
    request.end();
}

InitialMessage();
DataPluginsWebSocket();
TextWebSocket();
checkBlacklist();
checkWhitelist();
StatusInfoFMLIST();
setTimeout(() => {
    initializeAntennas(Antennas);
    sendNextAntennaCommand();
}, 500);
