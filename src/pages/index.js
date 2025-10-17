import React, { useState, useEffect, useCallback, useRef } from 'react';

// --- IndexedDB Configuration and Utility Functions ---

const DB_NAME = 'SimpleNameDB';
const STORE_NAME = 'names'; 
const DB_VERSION = 1;
const IDB_SUCCESS_MESSAGE = 'Record saved successfully to IndexedDB.';
const IDB_DELETE_MESSAGE = 'Record deleted successfully.';
const IDB_CLEAR_ALL_MESSAGE = 'All records cleared successfully.';
const IDB_ERROR_MESSAGE = 'Could not access IndexedDB. Check console for details.';
// localStorage key for event metadata
const EVENT_CONFIG_KEY = 'eventConfig';

/**
 * Opens a connection to IndexedDB, creating the object store if necessary.
 */
const openDB = () => new Promise((resolve, reject) => {
  if (!window.indexedDB) {
    reject(new Error("IndexedDB is not supported by this browser."));
    return;
  }

  const request = indexedDB.open(DB_NAME, DB_VERSION);

  request.onupgradeneeded = (event) => {
    const db = event.target.result;
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      console.log(`IndexedDB: Object store '${STORE_NAME}' created.`);
    }
  };

  request.onsuccess = (event) => {
    resolve(event.target.result);
  };

  request.onerror = (event) => {
    console.error("IndexedDB: Error opening database:", event.target.error);
    reject(event.target.error);
  };
});

/**
 * Adds a new record to the object store.
 */
const addRecord = async (recordData) => {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    // Add timestamp to the record using Date.now()
    const recordObject = { ...recordData, timestamp: Date.now() };

    return new Promise((resolve, reject) => {
      const request = store.add(recordObject);

      request.onsuccess = () => {
        resolve(request.result); 
      };

      request.onerror = (event) => {
        console.error("IndexedDB: Error adding record:", event.target.error);
        reject(event.target.error);
      };
    });
  } catch (error) {
    console.error("IDB Save Operation Failed:", error);
    throw new Error(IDB_ERROR_MESSAGE);
  }
};

/**
 * Retrieves all records from the object store.
 */
const getAllRecords = async () => {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.getAll();

      request.onsuccess = (event) => {
        // Reverse for newest first
        resolve(event.target.result.reverse());
      };

      request.onerror = (event) => {
        console.error("IndexedDB: Error getting records:", event.target.error);
        reject(event.target.error);
      };
    });
  } catch (error) {
    console.error("IDB Load Operation Failed:", error);
    throw new Error(IDB_ERROR_MESSAGE);
  }
};

/**
 * Deletes a record by its ID.
 */
const deleteRecord = async (id) => {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.delete(id); 

      request.onsuccess = () => {
        resolve(true);
      };

      request.onerror = (event) => {
        console.error("IndexedDB: Error deleting record:", event.target.error);
        reject(event.target.error);
      };
    });
  } catch (error) {
    console.error("IDB Delete Operation Failed:", error);
    throw new Error(IDB_ERROR_MESSAGE);
  }
};

/**
 * Clears all records from the object store.
 */
const deleteAllRecords = async () => {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.clear();

      request.onsuccess = () => {
        resolve(true);
      };

      request.onerror = (event) => {
        console.error("IndexedDB: Error clearing records:", event.target.error);
        reject(event.target.error);
      };
    });
  } catch (error) {
    console.error("IDB Clear All Operation Failed:", error);
    throw new Error(IDB_ERROR_MESSAGE);
  }
};


// --- Utility for Display ---

const getStatusBadges = (status) => {
    const safeStatus = status || {}; 
    
    const statuses = [];
    if (safeStatus.pwd) statuses.push(<span key="pwd" className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">PWD</span>);
    if (safeStatus.senior) statuses.push(<span key="senior" className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs font-medium">Senior</span>);
    if (safeStatus.osy) statuses.push(<span key="osy" className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-medium">OSY</span>);
    
    return statuses.length > 0 ? (
        <div className="flex gap-2 mt-2">{statuses}</div>
    ) : (
        <span className="text-xs text-gray-400 italic">None</span>
    );
};

// --- View Components ---

// Component for the Event Configuration Form
const ConfigView = ({ eventConfig, handleConfigChange }) => {
    const formatDateForInput = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        // Ensure date is valid and format as YYYY-MM-DD for input type="date"
        if (isNaN(date)) return '';
        return date.toISOString().split('T')[0];
    };

    return (
        <div className="space-y-8 p-4 bg-indigo-50/50 rounded-xl">
            <h2 className="text-2xl font-bold text-indigo-700 mb-4">
                Configure Event Details
            </h2>
            <p className="text-gray-600 text-sm">
                These details will be used as the title and context for the attendance records. They are saved locally in your browser.
            </p>

            {/* 1. Name of Activity */}
            <div>
                <label htmlFor="activityName" className="block text-lg font-medium text-gray-700 mb-1">
                    Activity Name
                </label>
                <input
                    id="activityName"
                    name="activityName"
                    type="text"
                    value={eventConfig.activityName}
                    onChange={handleConfigChange}
                    placeholder="e.g., Regional Tech Summit"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition text-gray-900"
                />
            </div>

            {/* 2. Venue */}
            <div>
                <label htmlFor="venue" className="block text-lg font-medium text-gray-700 mb-1">
                    Venue
                </label>
                <input
                    id="venue"
                    name="venue"
                    type="text"
                    value={eventConfig.venue}
                    onChange={handleConfigChange}
                    placeholder="e.g., Grand Ballroom, City Hotel"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition text-gray-900"
                />
            </div>

            {/* 3. Date */}
            <div>
                <label htmlFor="eventDate" className="block text-lg font-medium text-gray-700 mb-1">
                    Date
                </label>
                <input
                    id="eventDate"
                    name="eventDate"
                    type="date"
                    value={formatDateForInput(eventConfig.eventDate)}
                    onChange={handleConfigChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition text-gray-900"
                />
            </div>
        </div>
    );
};


// Component for the Form Input
const FormView = ({ 
    formData, 
    handleInputChange, 
    handleStatusChange, 
    handleSubmit, 
    isDBReady, 
    signatureCaptured, 
    canvasRef, 
    handleClearSignature, 
    message,
    eventConfig
}) => {
    // Determine the header text
    const headerText = eventConfig.activityName || "Activity Attendance";
    const subheaderText = eventConfig.venue && eventConfig.eventDate 
        ? `${eventConfig.venue} on ${new Date(eventConfig.eventDate).toLocaleDateString()}` 
        : "Please set up the event details in the 'Event Setup' tab.";

    return (
        <>
            <div className="mb-6 pb-4 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-800">{headerText}</h2>
                <p className={`text-md italic ${eventConfig.activityName ? 'text-indigo-600' : 'text-red-500'}`}>{subheaderText}</p>
            </div>
            
            <p className="text-sm text-gray-500 mb-6 text-justify">
                <strong>DATA PRIVACY NOTICE:</strong> The data and information provided in this form are solely intended for the designated activity. Any use of this data for purposes other than those intended by the process owner constitutes a violation of the Data Privacy Act of 2023. By voluntarily providing this data and information, the Data Subject explicitly consents to its use by the office for its intended purpose. This includes, but is not limited to, documentation processes related to the activity and sharing on social media platforms for promotional or informational purposes. Your likeness in event photos may be used. You can withdraw consent by contacting us at <strong>region9basulta@dict.gov.ph</strong>
            </p>

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Complete Name */}
                <div>
                    <label htmlFor="completeName" className="block text-lg font-medium text-gray-700 mb-1">
                        1. Complete Name <span className="text-red-500">*</span>
                    </label>
                    <input
                        id="completeName"
                        name="completeName"
                        type="text"
                        value={formData.completeName}
                        onChange={handleInputChange}
                        placeholder="First Name MI. Last Name"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition text-gray-900"
                        disabled={!isDBReady}
                        required
                    />
                </div>

                {/* Sex (Radio Select) */}
                <div>
                    <label className="block text-lg font-medium text-gray-700 mb-2">
                        2. Sex <span className="text-red-500">*</span>
                    </label>
                    <div className="flex space-x-6">
                        <label className="flex items-center space-x-2">
                            <input
                                type="radio"
                                name="sex"
                                value="M"
                                checked={formData.sex === 'M'}
                                onChange={handleInputChange}
                                className="text-indigo-600 focus:ring-indigo-500"
                                disabled={!isDBReady}
                                required
                            />
                            <span className="text-gray-700">Male (M)</span>
                        </label>
                        <label className="flex items-center space-x-2">
                            <input
                                type="radio"
                                name="sex"
                                value="F"
                                checked={formData.sex === 'F'}
                                onChange={handleInputChange}
                                className="text-indigo-600 focus:ring-indigo-500"
                                disabled={!isDBReady}
                                required
                            />
                            <span className="text-gray-700">Female (F)</span>
                        </label>
                    </div>
                </div>

                {/* Designation */}
                <div>
                    <label htmlFor="designation" className="block text-lg font-medium text-gray-700 mb-1">
                        3. Designation <span className="text-red-500">*</span>
                    </label>
                    <input
                        id="designation"
                        name="designation"
                        type="text"
                        value={formData.designation}
                        onChange={handleInputChange}
                        placeholder="e.g., Software Engineer"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition text-gray-900"
                        disabled={!isDBReady}
                        required
                    />
                </div>

                {/* Division */}
                <div>
                    <label htmlFor="division" className="block text-lg font-medium text-gray-700 mb-1">
                        4. Division <span className="text-red-500">*</span>
                    </label>
                    <input
                        id="division"
                        name="division"
                        type="text"
                        value={formData.division}
                        onChange={handleInputChange}
                        placeholder="e.g., Cloud Services"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition text-gray-900"
                        disabled={!isDBReady}
                        required
                    />
                </div>

                {/* Status Checkboxes (NOT required) */}
                <div>
                    <label className="block text-lg font-medium text-gray-700 mb-2">
                        5. Check if Applicable (Special Status)
                    </label>
                    <div className="flex flex-wrap gap-x-8 gap-y-2">
                        <label className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                name="pwd"
                                checked={formData.status.pwd}
                                onChange={handleStatusChange}
                                className="rounded text-indigo-600 focus:ring-indigo-500"
                                disabled={!isDBReady}
                            />
                            <span className="text-gray-700">PWD (Person with Disability)</span>
                        </label>
                        <label className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                name="senior"
                                checked={formData.status.senior}
                                onChange={handleStatusChange}
                                className="rounded text-indigo-600 focus:ring-indigo-500"
                                disabled={!isDBReady}
                            />
                            <span className="text-gray-700">Senior</span>
                        </label>
                        <label className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                name="osy"
                                checked={formData.status.osy}
                                onChange={handleStatusChange}
                                className="rounded text-indigo-600 focus:ring-indigo-500"
                                disabled={!isDBReady}
                            />
                            <span className="text-gray-700">OSY (Out-of-School Youth)</span>
                        </label>
                    </div>
                </div>
                
                {/* Signature Capture (6) */}
                <div>
                    <label className="block text-lg font-medium text-gray-700 mb-1">
                        6. Digital Signature <span className="text-red-500">*</span>
                    </label>
                    <div className="border border-gray-400 rounded-lg overflow-hidden bg-white relative shadow-inner">
                        <canvas
                            ref={canvasRef}
                            className="w-full h-auto cursor-crosshair border-b-2 border-indigo-500/50"
                        />
                        {!signatureCaptured && (
                            <div className="absolute inset-0 flex items-center justify-center text-gray-400 pointer-events-none bg-gray-50 bg-opacity-70">
                                Draw your signature here using mouse or touch.
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end mt-2">
                        <button
                            type="button"
                            onClick={handleClearSignature}
                            className="text-sm px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50"
                            disabled={!isDBReady}
                        >
                            Clear Signature
                        </button>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={!isDBReady || !formData.completeName.trim() || !formData.designation.trim() || !formData.division.trim()}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-lg font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out disabled:opacity-50"
                >
                    {isDBReady ? 'Save Record' : 'Connecting to DB...'}
                </button>
            </form>
            
            {/* Status Message */}
            {message && (
                <div className={`mt-6 p-3 rounded-lg text-sm font-medium ${message.includes('success') ? 'bg-green-100 text-green-700' : message.includes('SURE') || message.includes('confirm') ? 'bg-red-100 text-red-700 font-extrabold' : 'bg-red-100 text-red-700'}`}>
                    {message}
                </div>
            )}
        </>
    );
};

// Component for the Records List
const RecordsView = ({ storedRecords, isDBReady, handleDelete, handleClearAll, confirmClear, confirmDeleteId, eventConfig }) => (
    <div className="mt-8">
        <div className="mb-6 pb-4 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800">Attendance for {eventConfig.activityName || "Unconfigured Activity"}</h2>
            <p className="text-md italic text-indigo-600">{eventConfig.venue && eventConfig.eventDate 
                ? `${eventConfig.venue} on ${new Date(eventConfig.eventDate).toLocaleDateString()}` 
                : "Event details are missing. Configure in 'Event Setup' tab."}
            </p>
        </div>
        
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-800">
                Saved Records ({storedRecords.length})
            </h3>
            <button
                onClick={handleClearAll}
                disabled={!isDBReady || storedRecords.length === 0}
                className={`text-xs px-3 py-1 rounded-full font-medium transition duration-150 ease-in-out ${
                    confirmClear 
                        ? 'bg-red-600 text-white hover:bg-red-700 shadow-lg' 
                        : 'bg-gray-200 text-gray-700 hover:bg-red-500 hover:text-white'
                } disabled:opacity-50`}
            >
                {confirmClear ? 'CONFIRM DELETE ALL' : 'Clear All Records'}
            </button>
        </div>
        
        <div className="max-h-[70vh] overflow-y-auto space-y-3 p-3 bg-gray-50 rounded-lg border">
            {isDBReady && storedRecords.length > 0 ? (
                storedRecords.map((item) => {
                    const isPendingDelete = item.id === confirmDeleteId;
                    
                    // Format the timestamp for display
                    const timestampString = item.timestamp 
                        ? new Date(item.timestamp).toLocaleString() 
                        : 'N/A (Timestamp missing)';
                        
                    return (
                        <div key={item.id} className="p-4 bg-white border border-indigo-200 rounded-xl shadow-sm hover:shadow-md transition duration-150 relative">
                            <div className="flex justify-between items-start pr-10">
                                <div className="flex flex-col">
                                    <span className="text-lg font-bold text-indigo-600">{item.completeName || "Missing Name"}</span>
                                    <span className="text-sm text-gray-600 italic">{item.designation || "N/A"} in {item.division || "N/A"}</span>
                                    {/* Display Timestamp */}
                                    <span className="text-xs text-gray-400 mt-1 font-mono">
                                        Signed: {timestampString}
                                    </span>
                                </div>
                                <span className="text-xs font-semibold px-2 py-1 bg-gray-200 text-gray-700 rounded-full">
                                    {item.sex || "N/A"}
                                </span>
                            </div>
                            <div className="mt-3">
                                <p className="text-sm font-medium text-gray-700 mb-1">Special Status:</p>
                                {getStatusBadges(item.status)}
                            </div>
                            
                            {/* Signature Display */}
                            {item.signature && (
                                <div className="mt-3 pt-3 border-t border-gray-100">
                                    <p className="text-sm font-medium text-gray-700 mb-1">Digital Signature:</p>
                                    <img 
                                        src={item.signature} 
                                        alt={`Signature for ${item.completeName}`}
                                        className="w-full max-w-xs h-auto border border-gray-300 rounded-md bg-gray-50"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Stored as Data URL (PNG format).</p>
                                </div>
                            )}

                            {/* Individual Delete Button with Confirmation */}
                            <button
                                onClick={() => handleDelete(item.id)}
                                className={`absolute top-2 right-2 p-1 rounded-full transition ${
                                    isPendingDelete 
                                        ? 'bg-red-600 text-white hover:bg-red-700' 
                                        : 'text-red-500 hover:text-red-700 bg-red-100 hover:bg-red-200'
                                }`}
                                aria-label={isPendingDelete ? `Confirm deletion for ${item.completeName}` : `Delete record for ${item.completeName}`}
                            >
                                {isPendingDelete ? (
                                    // Alert/Warning Icon for confirmation pending
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-alert-triangle"><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                                ) : (
                                    // Trash Icon
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                                )}
                            </button>
                        </div>
                    );
                })
            ) : isDBReady ? (
                <p className="text-gray-500 italic p-3 text-center">No records saved yet. Start inputting data!</p>
            ) : (
                <p className="text-red-500 italic p-3 text-center">Cannot display data. IndexedDB error.</p>
            )}
        </div>
    </div>
);


// --- Main App Component ---

const initialFormData = {
    completeName: '',
    sex: 'M', 
    designation: '',
    division: '',
    status: {
        pwd: false,
        senior: false,
        osy: false,
    },
    signature: null, 
};

const initialEventConfig = {
    activityName: '',
    venue: '',
    eventDate: new Date().toISOString().split('T')[0], // Default to today's date
};

const App = () => {
  const [formData, setFormData] = useState(initialFormData);
  const [storedRecords, setStoredRecords] = useState([]);
  const [eventConfig, setEventConfig] = useState(initialEventConfig); // New state for config
  const [message, setMessage] = useState('');
  const [isDBReady, setIsDBReady] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null); // State for individual delete confirmation
  // State for routing: 'setup', 'form', or 'records'
  const [currentPage, setCurrentPage] = useState('setup'); 
  
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const [signatureCaptured, setSignatureCaptured] = useState(false); 

  /**
   * Fetches the current list of records from IndexedDB.
   */
  const fetchRecords = useCallback(async () => {
    try {
      const records = await getAllRecords();
      setStoredRecords(records);
      setIsDBReady(true);
      // Only clear non-error/non-confirmation messages on fetch success
      if (!message.includes('success') && !message.includes('confirm') && !message.includes('SURE')) {
          setMessage('');
      }
    } catch (error) {
      setMessage(IDB_ERROR_MESSAGE);
      setIsDBReady(false);
    }
  }, [message]);
  
  /**
   * Loads event configuration from localStorage on mount.
   */
  useEffect(() => {
    const savedConfig = localStorage.getItem(EVENT_CONFIG_KEY);
    if (savedConfig) {
        try {
            setEventConfig(JSON.parse(savedConfig));
        } catch (e) {
            console.error("Failed to parse event config from localStorage:", e);
        }
    } else {
        // If nothing is saved, ensure the default date is a clean ISO string
        setEventConfig(prev => ({ 
            ...prev, 
            eventDate: new Date().toISOString().split('T')[0] 
        }));
    }
    fetchRecords();
  }, [fetchRecords]);


  // Timer to clear the bulk confirmation state
  useEffect(() => {
    if (confirmClear) {
      const timer = setTimeout(() => setConfirmClear(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [confirmClear]);

  // Timer to clear the individual confirmation state
  useEffect(() => {
    if (confirmDeleteId !== null) {
      const timer = setTimeout(() => {
        setConfirmDeleteId(null);
        // Clear message if it's the specific delete confirmation message
        if (message.includes('Click the trash icon again')) {
            setMessage('');
        }
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [confirmDeleteId, message]);
  
  // Timer to clear success message after a few seconds
  useEffect(() => {
    if (message.includes('success')) {
      const timer = setTimeout(() => setMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);


  // --- Signature Drawing Logic ---
  useEffect(() => {
    const canvas = canvasRef.current;
    // Only initialize drawing listeners if we are on the form page
    if (currentPage !== 'form' || !canvas) return;

    const setCanvasDimensions = () => {
        // Use fixed dimensions for consistency in storage
        canvas.width = 400; 
        canvas.height = 150;
    };
    setCanvasDimensions();

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000000'; 

    let lastX = 0;
    let lastY = 0;

    const getCoords = (e) => {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        // Scale coordinates to match the canvas's internal resolution (400x150)
        return {
            x: x * (canvas.width / rect.width),
            y: y * (canvas.height / rect.height)
        };
    };

    const startDrawing = (e) => {
        if (!isDBReady) return; 
        e.preventDefault();
        isDrawingRef.current = true;
        const { x, y } = getCoords(e);
        [lastX, lastY] = [x, y];
        setSignatureCaptured(true);
    };

    const draw = (e) => {
        if (!isDrawingRef.current) return;
        e.preventDefault();
        
        const { x, y } = getCoords(e);
        
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.stroke();
        [lastX, lastY] = [x, y];
    };

    const stopDrawing = () => {
        isDrawingRef.current = false;
    };
    
    // Add event listeners for both mouse and touch
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    canvas.addEventListener('touchstart', startDrawing);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', stopDrawing);
    canvas.addEventListener('touchcancel', stopDrawing);


    return () => {
        // Cleanup function runs when component unmounts or dependencies change
        canvas.removeEventListener('mousedown', startDrawing);
        canvas.removeEventListener('mousemove', draw);
        canvas.removeEventListener('mouseup', stopDrawing);
        canvas.removeEventListener('mouseout', stopDrawing);

        canvas.removeEventListener('touchstart', startDrawing);
        canvas.removeEventListener('touchmove', draw);
        canvas.removeEventListener('touchend', stopDrawing);
        canvas.removeEventListener('touchcancel', stopDrawing);
    };
  }, [isDBReady, currentPage]); // Dependency on currentPage ensures listeners are correct


  // Clear signature function
  const handleClearSignature = () => {
      const canvas = canvasRef.current;
      if (canvas) {
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          setSignatureCaptured(false);
      }
  };

  /**
   * General handler for text and radio inputs.
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setConfirmClear(false); // Reset confirmation on any form interaction
    setConfirmDeleteId(null); // Reset individual confirmation
  };
  
  /**
   * Handler for event configuration changes and saving to localStorage.
   */
  const handleConfigChange = (e) => {
    const { name, value } = e.target;
    const newConfig = { ...eventConfig, [name]: value };
    setEventConfig(newConfig);
    // Persist configuration to localStorage immediately
    localStorage.setItem(EVENT_CONFIG_KEY, JSON.stringify(newConfig));
  };


  /**
   * Handler for the status checkboxes.
   */
  const handleStatusChange = (e) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      status: {
        ...prev.status,
        [name]: checked,
      }
    }));
    setConfirmClear(false); // Reset confirmation on any form interaction
    setConfirmDeleteId(null); // Reset individual confirmation
  };

  /**
   * Handles the form submission to save the record.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.completeName.trim() || !formData.designation.trim() || !formData.division.trim()) {
      setMessage('Please fill in all required fields (indicated by *).');
      return;
    }

    if (!signatureCaptured) {
        setMessage('Please provide a signature in section 6.');
        return;
    }
    
    const canvas = canvasRef.current;
    if (!canvas) {
        setMessage('Error: Signature canvas not found.');
        return;
    }
    
    // Capture the signature as a PNG Data URL string for IndexedDB storage
    const signatureData = canvas.toDataURL('image/png');


    if (!isDBReady) {
        setMessage('Database not ready. Cannot save.');
        return;
    }

    try {
      const newRecord = { 
          ...formData, 
          signature: signatureData // Save the captured signature data URL
      };
      
      await addRecord(newRecord); // This function now adds the timestamp
      
      setFormData(initialFormData); // Clear form data
      handleClearSignature(); // Clear the canvas after successful save
      setMessage(IDB_SUCCESS_MESSAGE);
      fetchRecords(); 
      setConfirmClear(false);
      setConfirmDeleteId(null); // Reset individual confirmation
    } catch (error) {
      setMessage(error.message || IDB_ERROR_MESSAGE);
    }
  };

  /**
   * Handles individual record deletion with confirmation logic.
   */
  const handleDelete = async (id) => {
    if (!isDBReady) return;

    if (confirmDeleteId === id) {
        // Second click: Perform actual deletion
        try {
            await deleteRecord(id);
            setMessage(IDB_DELETE_MESSAGE);
            setConfirmDeleteId(null);
            fetchRecords();
        } catch (error) {
            setMessage(error.message || 'Error deleting record.');
        }
    } else {
        // First click: Request confirmation
        const recordName = storedRecords.find(r => r.id === id)?.completeName;
        setMessage(`Click the icon again next to "${recordName}" to CONFIRM deletion. This action is irreversible.`);
        setConfirmDeleteId(id);
        setConfirmClear(false); // Clear bulk delete confirmation
    }
  };

  /**
   * Handles the multi-click confirmation for clearing all records.
   */
  const handleClearAll = async () => {
    if (!isDBReady) return;

    if (confirmClear) {
        // Second click: Perform deletion
        try {
            await deleteAllRecords();
            setMessage(IDB_CLEAR_ALL_MESSAGE);
            setConfirmClear(false);
            setConfirmDeleteId(null); // Reset individual confirmation
            fetchRecords();
        } catch (error) {
            setMessage(error.message || 'Error clearing all records.');
        }
    } else {
        // First click: Ask for confirmation
        setMessage('ARE YOU SURE? Click this button again to CONFIRM deleting ALL records.');
        setConfirmClear(true);
        setConfirmDeleteId(null); // Reset individual confirmation
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8 flex items-start justify-center font-sans">
      <div className="w-full max-w-2xl bg-white shadow-2xl rounded-xl p-6 sm:p-10 my-8">
        <h1 className="text-3xl font-extrabold text-indigo-700 mb-6 border-b pb-3">
          Attendance - Internal
        </h1>

        {/* Navigation Tabs */}
        <div className="flex mb-6 border-b border-gray-200">
            <button
                onClick={() => setCurrentPage('setup')}
                className={`py-2 px-4 text-lg font-medium transition duration-150 ${
                    currentPage === 'setup' 
                        ? 'border-b-4 border-indigo-600 text-indigo-700' 
                        : 'text-gray-500 hover:text-indigo-500'
                }`}
            >
                Event Setup
            </button>
            <button
                onClick={() => setCurrentPage('form')}
                className={`py-2 px-4 text-lg font-medium transition duration-150 ${
                    currentPage === 'form' 
                        ? 'border-b-4 border-indigo-600 text-indigo-700' 
                        : 'text-gray-500 hover:text-indigo-500'
                }`}
            >
                Entry Form
            </button>
            <button
                onClick={() => { setCurrentPage('records'); setConfirmClear(false); setConfirmDeleteId(null); }}
                className={`py-2 px-4 text-lg font-medium transition duration-150 ${
                    currentPage === 'records' 
                        ? 'border-b-4 border-indigo-600 text-indigo-700' 
                        : 'text-gray-500 hover:text-indigo-500'
                }`}
            >
                Saved Records
            </button>
        </div>

        {/* Conditional View Rendering */}
        {currentPage === 'setup' && (
            <ConfigView 
                eventConfig={eventConfig}
                handleConfigChange={handleConfigChange}
            />
        )}
        
        {currentPage === 'form' && (
            <FormView 
                formData={formData}
                handleInputChange={handleInputChange}
                handleStatusChange={handleStatusChange}
                handleSubmit={handleSubmit}
                isDBReady={isDBReady}
                signatureCaptured={signatureCaptured}
                canvasRef={canvasRef}
                handleClearSignature={handleClearSignature}
                message={message}
                eventConfig={eventConfig} // Pass config to display header
            />
        )}

        {currentPage === 'records' && (
            <RecordsView
                storedRecords={storedRecords}
                isDBReady={isDBReady}
                handleDelete={handleDelete}
                handleClearAll={handleClearAll}
                confirmClear={confirmClear}
                confirmDeleteId={confirmDeleteId} 
                eventConfig={eventConfig} // Pass config to display header
            />
        )}

        {/* Global Status Message for Records View */}
        {(currentPage === 'records' || currentPage === 'setup') && message && (
            <div className={`mt-6 p-3 rounded-lg text-sm font-medium ${message.includes('success') ? 'bg-green-100 text-green-700' : message.includes('SURE') || message.includes('confirm') ? 'bg-red-100 text-red-700 font-extrabold' : 'bg-red-100 text-red-700'}`}>
                {message}
            </div>
        )}
      </div>
    </div>
  );
};

export default App;
