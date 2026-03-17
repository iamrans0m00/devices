export enum ANTMessages {
    calibrationCommand = 1,
    calibrationStatus = 2,
    generalFE = 16,
    generalSettings = 17,
    trainerData = 25,
    basicResistance = 48,
    targetPower = 49,
    windResistance = 50,
    trackResistance = 51,
    feCapabilities = 54,
    userConfiguration = 55,
    requestData = 70,
    commandStatus = 71,
    manufactererData = 80,
    productInformation = 81,
    neoModes = 252
}

/**
 * Road surface types for Tacx Neo road feel simulation.
 * Values match the official Tacx protocol (pycycling / Garmin SDK).
 *
 *  0 = Off, 1 = Concrete, 2 = CattleGrid, 3 = CobblestonesHard,
 *  4 = CobblestonesSoft, 5 = BrickRoad, 6 = OffRoad, 7 = Gravel,
 *  8 = Ice, 9 = WoodenBoards
 */
export enum RoadFeelSurface {
    Off              = 0,
    Concrete         = 1,
    CattleGrid       = 2,
    CobblestonesHard = 3,
    CobblestonesSoft = 4,
    BrickRoad        = 5,
    OffRoad          = 6,
    Gravel           = 7,
    Ice              = 8,
    WoodenBoards     = 9
}

export const SYNC_BYTE = 0xA4; //164
export const DEFAULT_CHANNEL = 5;
export const ACKNOWLEDGED_DATA = 0x4F; //79

export const TACX_FE_C_BLE =  '6E40FEC1-B5A3-F393-E0A9-E50E24DCCA9E'
export const TACX_FE_C_RX  = '6E40FEC2-B5A3-F393-E0A9-E50E24DCCA9E'
export const TACX_FE_C_TX  = '6E40FEC3-B5A3-F393-E0A9-E50E24DCCA9E'
