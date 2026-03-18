export  type IncyclistAdapterData = {
    speed?: number;     // km/h
    slope?: number;     // %
    power?: number;     // W
    cadence?: number;   // rpm
    heartrate?: number; // bpm
    distance?: number;  // m    
    timestamp?: number;
    gearStr?: string
    gearInfo?: any

    deviceTime?: number;
    deviceDistanceCounter?: number;
    internalDistanceCounter?: number;
}
export type IncyclistBikeData = {
    isPedalling?: boolean
    power: number
    pedalRpm?: number
    speed: number           // km/h
    heartrate?: number
    distanceInternal?: number // Total Distance in meters 
    time?: number
    gear?: number
    gearStr?: string
    gearInfo?: any
    slope?: number
    resistance?: number
}
