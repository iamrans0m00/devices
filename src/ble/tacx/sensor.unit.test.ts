import TacxAdvancedFitnessMachineDevice from "./sensor";
import {TACX_FE_C_RX, TACX_FE_C_TX} from "./consts";
import { MockLogger } from "../../../test/logger";
import { CSP_MEASUREMENT } from "../consts";

describe('Tacx Sensor',()=>{

    describe('constructor',()=>{

        test('without peripheral',()=>{
            const c = new TacxAdvancedFitnessMachineDevice(null,{id:'4711',logger:MockLogger})

            // statics
            expect(c.getProfile()).toBe('Smart Trainer')
            expect(c.getProtocol()).toBe('tacx')
            expect(c.getServiceUUids()).toEqual(['6E40FEC1-B5A3-F393-E0A9-E50E24DCCA9E'])


        })
        test('with peripheral',()=>{
            
        })


    })


    describe('onData',()=>{

        let sensor: TacxAdvancedFitnessMachineDevice
        let logSpy = jest.fn()
        const send = (d)=>sensor.onData(TACX_FE_C_RX,Buffer.from(d,'hex'))

        beforeEach(()=>{
            sensor = new TacxAdvancedFitnessMachineDevice(null)
            sensor.logEvent = logSpy
        })

        afterEach(()=>{
            jest.resetAllMocks()
        })

        test('Missing SYNC',()=>{          
            expect(send('12a4094e05191f00000000402080')).toBeUndefined()
            expect(logSpy).toHaveBeenCalledWith({message:'SYNC missing',raw:'12a4094e05191f00000000402080'})
        })

        test('Valid TacxRx GeneralFE data',()=>{
            expect(send('a4094e05101900000000ff2434')).toEqual({State:'READY', EquipmentType:'Trainer', speed:0, raw:expect.any(String)})   
            expect(send('a4094e05101900000000303534')).toMatchObject({State:'IN_USE', EquipmentType:'Trainer', heartrate:48})
            expect(send('a4094e05101900000000ff1434')).toMatchObject({State:'OFF'})   
            expect(send('a4094e05101900000000ff4434')).toMatchObject({State:'FINISHED'})   
        })

        
        test('Valid TacxRx Trainer data',()=>{
            expect(send('a4094e05191f00000000402080')).toMatchObject({State:'READY'})
        })
        test('Valid TacxRx Product information',()=>{
            expect(send('a4094e0551ff00070f57000017')).toMatchObject({SerialNumber:22287, SwVersion:7})
        })


        test('repeated messages in state READY',()=>{

            send('a4094e011945ff2acf6d0020e9')
            expect(send('a4094e01194cff25d26b0020f4')).toMatchObject({instantaneousPower:107})
        })

        test('power',()=>{
           
            sensor.onData(CSP_MEASUREMENT,Buffer.from([3,119,1,0,0,195,176,48,0,0,32]));
            const res = sensor.onData(CSP_MEASUREMENT, Buffer.from([3,119,1,0,0,195,176,48,0,0,56]));
            expect(res).toMatchObject({instantaneousPower:1})
        }) 
    
    
        test('repeated message',()=>{
    
            sensor.emit = jest.fn()
    
            sensor.onData('2a5b',Buffer.from([3,119,1,0,0,195,176,48,0,0,32]));
            sensor.onData('0x2a5b',Buffer.from([3,119,1,0,0,195,176,48,0,0,32]));
            sensor.onData('2a5b',Buffer.from([3,119,1,0,0,195,176,48,0,0,32]));
            sensor.onData('2a5b',Buffer.from([3,119,1,0,0,195,176,48,0,0,32]));
            expect(sensor.emit).toHaveBeenCalledTimes(1)
        }) 


    })

    describe ('setSlope',()=>{
    
        test('slope 0.0, rr not set',async ()=>{
            const expected = Buffer.from( 'A4094F0533FFFFFFFF204E42F8','hex')
            const peripheral = {
                write: jest.fn().mockResolvedValue(expected),
                isConnected: jest.fn().mockReturnValue(true)
            }
            const tacx = new TacxAdvancedFitnessMachineDevice(peripheral, {id:'4711',logger:MockLogger});
            
            const res = await tacx.setSlope(0.0)
            expect(res).toBe(true)
            expect(peripheral.write).toHaveBeenCalledWith(TACX_FE_C_TX, expected,{withoutResponse:true})
        })
        test('not connected',async ()=>{
            const expected = Buffer.from( 'A4094F0533FFFFFFFF204E42F8','hex')
            const peripheral = {
                write: jest.fn().mockResolvedValue(expected),
                isConnected: jest.fn().mockReturnValue(false)
            }
            const tacx = new TacxAdvancedFitnessMachineDevice(peripheral, {id:'4711',logger:MockLogger});
            
            const res = await tacx.setSlope(0.0)
            expect(res).toBe(false)
            expect(peripheral.write).not.toHaveBeenCalled()
        })
    
    
    })


    describe('sendRoadFeel', () => {

        let sensor: TacxAdvancedFitnessMachineDevice;

        const makePeripheral = () => ({
            write: vi.fn().mockResolvedValue(true),
            isConnected: vi.fn().mockReturnValue(true),
        });

        beforeEach(() => {
            sensor = new TacxAdvancedFitnessMachineDevice(null, { id: '4711', logger: MockLogger });
        });

        test('Road surface at full intensity sends correct FE-C page 221 bytes', async () => {
            // surface=1 (Road), intensity=100 -> page 0xDD
            const expected = Buffer.from('A4094F05DD0164FFFFFFFFFFA0', 'hex');
            const peripheral = makePeripheral();
            sensor = new TacxAdvancedFitnessMachineDevice(peripheral, { id: '4711', logger: MockLogger });

            const res = await sensor.sendRoadFeel(1, 100);

            expect(res).toBe(true);
            expect(peripheral.write).toHaveBeenCalledWith(TACX_FE_C_TX, expected, { withoutResponse: true });
        });

        test('Off (surface=0, intensity=0) sends correct bytes', async () => {
            const expected = Buffer.from('A4094F05DD0000FFFFFFFFFFC5', 'hex');
            const peripheral = makePeripheral();
            sensor = new TacxAdvancedFitnessMachineDevice(peripheral, { id: '4711', logger: MockLogger });

            const res = await sensor.sendRoadFeel(0, 0);

            expect(res).toBe(true);
            expect(peripheral.write).toHaveBeenCalledWith(TACX_FE_C_TX, expected, { withoutResponse: true });
        });

        test('CobblestoneHard at 50% intensity sends correct bytes', async () => {
            // surface=2, intensity=50 -> 0x32 = 50
            const expected = Buffer.from('A4094F05DD0232FFFFFFFFFFF5', 'hex');
            const peripheral = makePeripheral();
            sensor = new TacxAdvancedFitnessMachineDevice(peripheral, { id: '4711', logger: MockLogger });

            const res = await sensor.sendRoadFeel(2, 50);

            expect(res).toBe(true);
            expect(peripheral.write).toHaveBeenCalledWith(TACX_FE_C_TX, expected, { withoutResponse: true });
        });

        test('intensity is clamped to 100 when above 100', async () => {
            const expected = Buffer.from('A4094F05DD0164FFFFFFFFFFA0', 'hex'); // 0x64 = 100
            const peripheral = makePeripheral();
            sensor = new TacxAdvancedFitnessMachineDevice(peripheral, { id: '4711', logger: MockLogger });

            await sensor.sendRoadFeel(1, 150);

            expect(peripheral.write).toHaveBeenCalledWith(TACX_FE_C_TX, expected, { withoutResponse: true });
        });

        test('intensity is clamped to 0 when below 0', async () => {
            const expected = Buffer.from('A4094F05DD0100FFFFFFFFFFC4', 'hex'); // surface=1, intensity=0
            const peripheral = makePeripheral();
            sensor = new TacxAdvancedFitnessMachineDevice(peripheral, { id: '4711', logger: MockLogger });

            await sensor.sendRoadFeel(1, -10);

            expect(peripheral.write).toHaveBeenCalledWith(TACX_FE_C_TX, expected, { withoutResponse: true });
        });

        test('default intensity is 100', async () => {
            const expected = Buffer.from('A4094F05DD0164FFFFFFFFFFA0', 'hex');
            const peripheral = makePeripheral();
            sensor = new TacxAdvancedFitnessMachineDevice(peripheral, { id: '4711', logger: MockLogger });

            await sensor.sendRoadFeel(1);

            expect(peripheral.write).toHaveBeenCalledWith(TACX_FE_C_TX, expected, { withoutResponse: true });
        });

        test('returns false when write fails', async () => {
            const peripheral = {
                write: vi.fn().mockRejectedValue(new Error('BLE error')),
                isConnected: vi.fn().mockReturnValue(true),
            };
            sensor = new TacxAdvancedFitnessMachineDevice(peripheral, { id: '4711', logger: MockLogger });

            const res = await sensor.sendRoadFeel(1, 100);

            expect(res).toBe(false);
        });

        // ── parameterised: every RoadFeelSurface at 100% intensity ──────────
        describe('all RoadFeelSurface values at 100% intensity', () => {

            /**
             * Expected bytes computed via the same getChecksum() XOR chain used
             * by buildMessage(): (c ^ byte) % 0xFF for each byte in the message.
             *
             * Message layout (13 bytes):
             *   A4  09  4F  05  DD  [surf]  64  FF FF FF FF FF  [chk]
             *   SYN LEN MID  CH  PG  surf  100  -----5xrsvd----  chk
             */
            const surfaceCases: Array<[string, number, string]> = [
                ['Off',             0,  'A4094F05DD0064FFFFFFFFFFA1'],
                ['Road',            1,  'A4094F05DD0164FFFFFFFFFFA0'],
                ['CobblestoneHard', 2,  'A4094F05DD0264FFFFFFFFFFA3'],
                ['CobblestoneEasy', 3,  'A4094F05DD0364FFFFFFFFFFA2'],
                ['BrickRoad',       4,  'A4094F05DD0464FFFFFFFFFFA5'],
                ['Gravel',          5,  'A4094F05DD0564FFFFFFFFFFA4'],
                ['Ice',             6,  'A4094F05DD0664FFFFFFFFFFA7'],
                ['WoodenPlanks',    7,  'A4094F05DD0764FFFFFFFFFFA6'],
                ['GravelLight',     8,  'A4094F05DD0864FFFFFFFFFFA9'],
                ['GravelDeep',      9,  'A4094F05DD0964FFFFFFFFFFA8'],
                ['Snow',           10,  'A4094F05DD0A64FFFFFFFFFFAB'],
            ];

            test.each(surfaceCases)(
                '%s (surface=%i) produces correct 13-byte FE-C page 221 message',
                async (_name, surfaceValue, expectedHex) => {
                    const expected = Buffer.from(expectedHex, 'hex');
                    const peripheral = makePeripheral();
                    sensor = new TacxAdvancedFitnessMachineDevice(peripheral, { id: '4711', logger: MockLogger });

                    const res = await sensor.sendRoadFeel(surfaceValue, 100);

                    expect(res).toBe(true);
                    expect(peripheral.write).toHaveBeenCalledOnce();
                    expect(peripheral.write).toHaveBeenCalledWith(TACX_FE_C_TX, expected, { withoutResponse: true });
                }
            );

        });

    }); // -- sendRoadFeel --

}) // -- Tacx Sensor --
