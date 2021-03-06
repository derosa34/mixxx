////////////////////////////////////////////////////////////////////////
// JSHint configuration                                               //
////////////////////////////////////////////////////////////////////////
/* global engine                                                      */
/* global script                                                      */
/* global print                                                       */
/* global midi                                                        */
/* global components                                                  */
////////////////////////////////////////////////////////////////////////


////////////////////////////////////////////////////////////////////////
// Controller: Denon DN-S1200
// URL:        TO BE DETERMINED
// Author:     Christophe ROZALE
////////////////////////////////////////////////////////////////////////


var DNS1200 = {};

/**
 * User definable controller parameters
 */
 
// Pitch fader ranges to cycle through with the RANGE button
DNS1200.rateRanges = [0.08, 0.16, 0.5];

// Scratch algorithm parameters
DNS1200.scratchParams = {
    recordSpeed: 33.3333333333, //previous was 33.3333333
    alpha: (1.0/8),
    beta: (1.0/8)/32.0
};

// Sensitivity of the jog wheel (NOTE: sensitivity depends on audio latency)
DNS1200.jogParams = {
    sensitivity: 25,
    maxJogValue: 3
};

// Eventually we will support 2 of these devices -- in that case
// one device will be decks 1 and 3, and the other will be 2 and 4.
// More work needed.
DNS1200.firstDeckGroup = "[Channel1]";
DNS1200.secondDeckGroup = "[Channel2]";
DNS1200.midiChannelBase = 0xB0; //TBD

// Hardware constant for resolution of the jog wheel
// This was found by averaging total 'ticks' received over 10 rotations
DNS1200.jogWheelTicksPerRevolution = 1480;
DNS1200.jogStep=3;

////////////////////////////////////////////////////////////////////////
// Fixed constants                                                    //
////////////////////////////////////////////////////////////////////////

// Controller constants
DNS1200.BRAND = "Denon";
DNS1200.MODEL = "DN-S1200";
// MIDI constants
DNS1200.MIDI_CH0 = 0x00;
DNS1200.MIDI_CH1 = 0x01;
DNS1200.MIDI_CH2 = 0x02;
DNS1200.MIDI_CH3 = 0x03;
DNS1200.MIDI_CH3 = 0x04;
// MIDI constants
DNS1200.MIDI_CH = [];
DNS1200.MIDI_CH["[Channel1]"] = 0xB0;
DNS1200.MIDI_CH["[Channel2]"] = 0xB1;
// LED constants
DNS1200.MIDI_TRI_LED_ON = 0x4A;
DNS1200.MIDI_TRI_LED_OFF = 0x4B;
DNS1200.MIDI_TRI_LED_BLINK = 0x4C;
// HID Status constants
DNS1200.LIGHT_ON = 1;
DNS1200.LIGHT_OFF = 0;
DNS1200.LIGHT_BLINK = 2;

// Effects Array
DNS1200.EFFECTS = [];
DNS1200.EFFECTS["None"] = 0;
DNS1200.EFFECTS["Autopan"] = 1;
DNS1200.EFFECTS["Balance"] = 2;
DNS1200.EFFECTS["Echo"] = 8;
DNS1200.EFFECTS["Filter"] = 9;
DNS1200.EFFECTS["Flanger"] = 10;
DNS1200.EFFECTS["Moog Filter"] = 15;
DNS1200.EFFECTS["Phaser"] = 17;
DNS1200.EFFECTS["Reverb"] = 18;
DNS1200.myEffects = ["None", "Autopan", "Balance", "Echo", "Filter", "Flanger", "Moog Filter", "Phaser", "Reverb"];
DNS1200.keyTrans = {1:"C", 2:"Db", 3:"D", 4:"Eb", 5:"E", 6:"F", 7:"F#/Gb", 8:"G", 9:"Ab", 10:"A", 11:"Bb", 12:"B", 13:"Cm", 14:"C#m", 15:"Dm", 16:"D#m/Ebm", 17:"Em", 18:"Fm", 19:"F#m", 20:"Gm", 21:"G#m", 22:"Am", 23:"Bbm", 24:"Bm"};
// Define Deck Table
DNS1200.Deck = []; //Mustbe declared here to be accessible from the rest of scripts !!

DNS1200.pitchTimer = 0;
//DNS1200.displayTempTextTimer = 0;


////////////////////////////////////////////////////////////////////////
// Logging functions                                                  //
////////////////////////////////////////////////////////////////////////

DNS1200.logDebug = function (msg) {
    if (DNS1200.debug) {
        print("[" + DNS1200.id + " DEBUG] " + msg);
    }
};

DNS1200.logInfo = function (msg) {
    print("[" + DNS1200.id + " INFO] " + msg);
};

DNS1200.logWarning = function (msg) {
    print("[" + DNS1200.id + " WARNING] " + msg);
};

DNS1200.logError = function (msg) {
    print("[" + DNS1200.id + " ERROR] " + msg);
};

////////////////////////////////////////////////////////////////////////
// Deck Management                                                    //
////////////////////////////////////////////////////////////////////////

DNS1200.init = function (id, debug) {
    DNS1200.id = id;
    DNS1200.debug = debug;

    
    
    // Decks
	//Previous code need some elements specific to deck to be accessed with direct object name. ex: DNS1200.leftDeck.isVinylMode
    //DNS1200.leftDeck = new DNS1200.Deck(DNS1200.MIDI_CH1);
	DNS1200.logInfo("Initializing Denon DNS-1200 controller id="+id);
	DNS1200.logInfo("Creating Deck for Channel 1");
	DNS1200.Deck["[Channel1]"] = new DNS1200.createDeck(DNS1200.MIDI_CH1);
	DNS1200.logInfo("Creating Deck for Channel 2");
	DNS1200.Deck["[Channel2]"] = new DNS1200.createDeck(DNS1200.MIDI_CH2);	
    DNS1200.logInfo("All is Ok");
    //Initialise Engine Startup Values
    


    
    //Tests and Debug
    //CheckAndDebug();
    
};

DNS1200.shutdown = function () {
    DNS1200.logInfo("Shutting down Denon DNS-1200 controller");

    try {
        //DNS1200.disconnectControls();
        //DNS1200.disconnectLeds();
        //DNS1200.restoreValues();
    } catch (ex) {
        DNS1200.logError("Exception during controller shutdown: " + ex);
    }
};

/**
 * Container class to hold the controls which are repeated on both decks
 */
DNS1200.createDeck = function (channel) {
    // Some state variables
    this.isVinylMode = true;
    this.remain_mode = true;
    this.active_effect = 0;
    this.paramKnobPressed = false;
    this.midiChannel = channel-1;
    this.engineChannel = channel;
    this.group = '[Channel' + this.engineChannel + ']';
    this.effect = [];
    this.effect[1] = DNS1200.myEffects.indexOf("Echo");
    this.effect[2] = DNS1200.myEffects.indexOf("Flanger");
    this.effect[3] = DNS1200.myEffects.indexOf("Filter");
    this.brake_mode = false;
	this.flip_pressed = false;
	this.memo_pressed = false;
	this.TAP_pressed = false;
	this.hotcue_mode = false;
	this.pitchkey_mode = 1; //0 for OFF,1 for mastertempo,2 for manual key change
	this.displayTempTextTimer = 0;


	//Initialize leds and symbols
	DNS1200.initDeckLEDS(this.group);
	
    //Initialize Screen
	DNS1200.logInfo("Initialize Screen"); 
    midi.sendShortMsg(DNS1200.MIDI_CH[this.group], 0x48, 0); //Track position normal
    DNS1200.displayTrackTime(DNS1200.MIDI_CH[this.group], 111, 111, 111); //Remove any char

    //Initialize Engine
	DNS1200.logInfo("Initialize Engine"); 
    engine.setParameter("[EffectRack1_EffectUnit"+this.engineChannel+"_Effect1]","enabled",0); //Effet 1 to "Disabled"
    engine.setParameter("[EffectRack1_EffectUnit"+this.engineChannel+"_Effect2]","enabled",0); //Effet 2 to "Disabled"
    engine.setParameter("[EffectRack1_EffectUnit"+this.engineChannel+"_Effect3]","enabled",0); //Effet 3 to "Disabled"

	//Assign effectUnit n to Deck n
	DNS1200.logInfo("Assign effectUnit "+this.engineChannel+" to Deck "+this.engineChannel+""); 
    engine.setParameter("[EffectRack1_EffectUnit"+this.engineChannel+"]","group_[Channel"+this.engineChannel+"]_enable",true); 
    
	//Remove any previous affecation for effectUnit n to Master
    DNS1200.logInfo("Remove any previous affecation for effectUnit "+this.engineChannel+" to Master"); 
	engine.setParameter("[EffectRack1_EffectUnit"+this.engineChannel+"]","group_[Master]_enable",false); 
    //The following worked
	//engine.setParameter("[EffectRack1_EffectUnit2]","group_[Master]_enable",false); 
    
    //Enable quantize
	DNS1200.logInfo("Enable quantize"); 
    engine.setParameter(this.group,"quantize",true);
    
    //Initialize display lines with welcome message
	DNS1200.logInfo("Initialize display lines with welcome message");
    DNS1200.displayTextLine1(this.group, "Desk N°"+this.engineChannel);
    DNS1200.displayTextLine2(this.group, "Derosa");
    //midi.sendShortMsg(0xB0, 0x4D, 0x22); //Switch On Scratch button
    //midi.sendShortMsg(0xB0 + this.midiChannel, 0x4A, 0x06); //Switch On Scratch button
    
    //Set default effects
	DNS1200.logInfo("Set default effects");
    DNS1200.updateEffect(this.engineChannel, 1, DNS1200.EFFECTS["Echo"]);
    DNS1200.updateEffect(this.engineChannel, 2, DNS1200.EFFECTS["Flanger"]);
    DNS1200.updateEffect(this.engineChannel, 3, DNS1200.EFFECTS["Filter"]);
        

    //Initialise Mixxx engine control to specific functions in charge of managing Device behaviour (LED)
    //engine.connectControl(this.group, "play", "DNS1200.playChanged");
	DNS1200.logInfo("Initialise Mixxx engine control");
    engine.connectControl(this.group, "playposition", "DNS1200.playPositionChanged");
    engine.connectControl(this.group, "rate", "DNS1200.rateDisplay");
    engine.connectControl(this.group, "duration","DNS1200.durationCallback");
    
    // Lights on this controller are chosen by midi value, not control value, so they all
    // need to be script-controlled.
    engine.connectControl(this.group,"play_indicator","DNS1200.playLight");
    engine.connectControl(this.group,"cue_indicator","DNS1200.cueLight");
    engine.connectControl(this.group,"reverse","DNS1200.reverseLight");
    engine.connectControl(this.group,"reverseroll","DNS1200.dumpLight");
    
    
    DNS1200.logInfo("Initializing controller DNS1200");
    
    // Match pitch fader direction with controller
    engine.setValue(this.group, "rate_dir", -1);
	
    // Rate range toggle button callback
	//TODO this is not yet matched with any button of Denon controller. Please do it
    this.rateRange = function(midichan, control, value, status, group) {
        if (value === 0) return;     // don't respond to note off messages
        var currRateRange = engine.getValue(group, "rateRange");
        engine.setValue(this.group, "rateRange", DNS1200.getNextRateRange(currRateRange));
    };

};

// Callback for toggling the vinyl mode button
DNS1200.jogModeToggle = function (channel, control, value, status, group) {
	
	if (value === 0) return;     // don't respond to note off messages
	DNS1200.Deck[group].isVinylMode = !DNS1200.Deck[group].isVinylMode;
	DNS1200.toggleLightLayer1(group, 0x06, DNS1200.Deck[group].isVinylMode);
	//midi.sendShortMsg(0xB0 + this.midiChannel, 0x06, this.isVinylMode ? 0x4A: 0x4B);
	//DNS1200.logInfo("jogModeToggle called: channel:"+channel+" control:"+control+" value:"+value+" status:"+status+" group:"+group);
	//DNS1200.logInfo(" Value for isVinylMode:"+DNS1200.Deck[group].isVinylMode);

}


// Callback for toggling the time mode button
DNS1200.timeKey = function (channel, control, value, status, group) {
	//DNS1200.logInfo("timeKey called: channel:"+channel+" control:"+control+" value:"+value+" status:"+status+" group:"+group);
	if (value === 0) return;     // don't respond to note off messages
	DNS1200.Deck[group].remain_mode = !DNS1200.Deck[group].remain_mode;
	DNS1200.updateTrackTime(value, group);
	//DNS1200.logInfo("remain_mode: "+DNS1200.Deck[group].remain_mode);
	midi.sendShortMsg(DNS1200.MIDI_CH[group], DNS1200.Deck[group].remain_mode ? 0x4D: 0x4E, 0x02); //VFD Symbol: REMAIN
	midi.sendShortMsg(DNS1200.MIDI_CH[group], DNS1200.Deck[group].remain_mode ? 0x4E: 0x4D, 0x03); //VFD Symbol: ELAPSED
}


// The jog wheel periodically sends the number of "ticks" it has been rotated by since the last message
// For scratching, we just tell this directly to the scratch engine, which rotates the record by specified amount.
// Jogging works differently: the "jog" engine samples the jog value at a rate of 1/(sound_card_latency),
// adds this jog value to an internal 25 sample buffer, and then sets the jog value to zero.
// The engine takes the average of the 25 sample buffer, divides by 10, and adds this to the rate at 
// which the song is playing (e.g. determined by the pitch fader). Since the effect of this depends on many factors 
// we can only really give an empirical senstivity which makes jog work "how we like it".        
DNS1200.jogWheel = function (channel, control, value, status, group) {
	              //DNS1200.logInfo("Well arrived here !");
	//var numTicks = (value < 64) ? (value - 0x80) : value;
	var numTicks = (value > 64) ? DNS1200.jogStep : (0-DNS1200.jogStep);
	//If scratch mode enabled, jogwheel will act on track position
	if (engine.isScratching(DNS1200.Deck[group].engineChannel)) {
		//DNS1200.logDebug("Scratching : value="+numTicks);
		engine.scratchTick(DNS1200.Deck[group].engineChannel, numTicks);
	} else if (DNS1200.Deck[group].active_effect) { //if not scratch mode, then jogwheel will act on effect "meta knob" value
		//Value 63 if counterclockwise
		//Value 65 if clockwise
		DNS1200.metaKnob(group, (64-value)/1000);
		//DNS1200.logDebug("jogWheel : value:"+value+" status:"+status);
	}
}

DNS1200.brake_button = function(channel, control, value, status, group) {
//        DNS1200.logDebug("brake_button called : channel:"+channel+" control:"+control+" value:"+value+" status:"+status+" group:"+group);
	var deck = parseInt(group.substring(8,9)); // work out which deck we are using 
	if (value) { //Button pressed
		//Toggle Brake Mode
		DNS1200.Deck[group].brake_mode = !DNS1200.Deck[group].brake_mode;
		//DNS1200.logDebug("engine.brake(deck="+deck+", this.brake_mode"+this.brake_mode);
//          engine.softStart(deck, true);
	} //Nothing to do whenbutton is released
}

	
// Callback for touching the jog wheel platter
DNS1200.platterTouch = function (channel, control, value, status, group) {

	if (DNS1200.Deck[group].isVinylMode) {
		if (value > 0) {
//               DNS1200.logInfo("Yep Now Scratch Is Enabled");
			engine.scratchEnable(DNS1200.Deck[group].engineChannel, DNS1200.jogWheelTicksPerRevolution, 
				DNS1200.scratchParams.recordSpeed , DNS1200.scratchParams.alpha, DNS1200.scratchParams.beta);
		} else { 
//                DNS1200.logInfo("Scratch STOP");
			engine.scratchDisable(DNS1200.Deck[group].engineChannel);
		}
		//Update Denon "Touch dot" status
		midi.sendShortMsg(DNS1200.MIDI_CH[group], value > 0 ? 0x4D: 0x4E, 0x20);
	}

}


// Callback for pressing loop in key
DNS1200.loopCallback = function (channel, control, value, status, group) {
	//if A1 or A2 key is pressed
	//switch ()
	switch(control) {
		case 54: //Flip is pressed or released
			DNS1200.logInfo("Flip is pressed channel:"+channel+" control:"+control+" value:"+value+" status:"+status+" group:"+group);
			DNS1200.Deck[group].flip_pressed = (value > 0) ? true : false;
			//if (value === 0) return;     // don't respond to note off messages
			break;
        case 55: //A1 is pressed or released
			DNS1200.logInfo("A1 is pressed channel:"+channel+" control:"+control+" value:"+value+" status:"+status+" group:"+group);
			if (DNS1200.Deck[group].hotcue_mode) {
				if (value === 0) return;     // don't respond to note off messages
				/*
				if (DNS1200.Deck[group].memo_pressed) {
					engine.setValue(group, "hotcue_1_activate", 1);
					//DNS1200.displayTextLine1(group, "Hot Cue 1");
					//DNS1200.displayTextLine2(group, "Set");
					DNS1200.Deck[group].memo_pressed = false;
				} else if (DNS1200.Deck[group].flip_pressed) {
					engine.setValue(group, "hotcue_1_clear", 1);
					DNS1200.displayTextLine1(group, "A1 Clear");
				} else if (engine.getValue(group, "hotcue_1_enabled")) {
				engine.setValue(group, "hotcue_1_activate", 1);
				}
				 */
				if (DNS1200.Deck[group].flip_pressed) {
					engine.setValue(group, "hotcue_1_clear", 1);
					DNS1200.displayTempText(group, 2000, "A1 Clear", "");
				} else {
					var cueState = (engine.getValue(group, "hotcue_1_enabled")) ? "Called" : "Set";
					engine.setValue(group, "hotcue_1_activate", 1);
					DNS1200.displayTempText(group, 2000, "A1 "+cueState, "");
				}
				//Update HotCue LED
				DNS1200.updateHotCueLED(group);
			} else {
				engine.setValue(group, "loop_in", value);
				DNS1200.toggleLightLayer1(group,0x24,2); //BLINK for LED: A1
				DNS1200.toggleLightLayer2(group,0x16,2); //BLINK for (: A1 Side
				DNS1200.toggleLightLayer2(group,0x1A,2); //BLINK for A1 Side					
			} 
			break;
		case 56: //A2 is pressed or released
			DNS1200.logInfo("A2 is pressed channel:"+channel+" control:"+control+" value:"+value+" status:"+status+" group:"+group);
			if (DNS1200.Deck[group].hotcue_mode) {
				if (value === 0) return;     // don't respond to note off messages
/*
				if (DNS1200.Deck[group].memo_pressed) {
					engine.setValue(group, "hotcue_2_activate", 1);
					//DNS1200.displayTextLine1(group, "Hot Cue 2");
					//DNS1200.displayTextLine2(group, "Set");
					DNS1200.Deck[group].memo_pressed = false;
				} else if (DNS1200.Deck[group].flip_pressed) {
					engine.setValue(group, "hotcue_2_clear", 1);
					DNS1200.displayTextLine1(group, "A2 Clear");
					//DNS1200.displayTextLine2(group, "Cleared");
				} else if (engine.getValue(group, "hotcue_2_enabled")) {
					engine.setValue(group, "hotcue_2_activate", 1);
				}
*/
				if (DNS1200.Deck[group].flip_pressed) {
					engine.setValue(group, "hotcue_2_clear", 1);
					DNS1200.displayTempText(group, 2000, "A2 Clear", "");
				} else {
					var cueState = (engine.getValue(group, "hotcue_2_enabled")) ? "Called" : "Set";
					engine.setValue(group, "hotcue_2_activate", 1);
					DNS1200.displayTempText(group, 2000, "A2 "+cueState, "");
				}
				//Update HotCue LED
				DNS1200.updateHotCueLED(group);
			} else {
				engine.setValue(group, "beatloop_activate", 1);
				DNS1200.toggleLightLayer1(group,0x24,1); //ON for LED: A1
				DNS1200.toggleLightLayer2(group,0x16,1); //BLINK for (: A1 Side
				DNS1200.toggleLightLayer2(group,0x1A,1); //BLINK for A1 Side					
				DNS1200.toggleLightLayer2(group,0x18,1); //BLINK for ): A1 Side					
				DNS1200.toggleLightLayer2(group,0x1C,1); //BLINK for B: A1 Side					
			}
			DNS1200.logInfo("beatloop_size:"+engine.getValue(group, "beatloop_size"));
			//beatloop_activate
			break;
		case 57: //B is pressed or released
			DNS1200.logInfo("B is pressed channel:"+channel+" control:"+control+" value:"+value+" status:"+status+" group:"+group);
			if (DNS1200.Deck[group].hotcue_mode) {
				if (value === 0) return;     // don't respond to note off messages
				if (DNS1200.Deck[group].memo_pressed) {
					engine.setValue(group, "hotcue_3_activate", 1);
					DNS1200.displayTextLine1(group, "Hot Cue 3");
					DNS1200.displayTextLine2(group, "Set");
					DNS1200.Deck[group].memo_pressed = false;
				} else if (DNS1200.Deck[group].flip_pressed) {
					engine.setValue(group, "hotcue_3_clear", 1);
					DNS1200.displayTextLine1(group, "Hot Cue 3");
					DNS1200.displayTextLine2(group, "Cleared");
				} else if (engine.getValue(group, "hotcue_3_enabled")) {
					engine.setValue(group, "hotcue_3_activate", 1);
				}
				//Update HotCue LED
				DNS1200.updateHotCueLED(group);
			} else {
				engine.setValue(group, "loop_out", value);
				DNS1200.toggleLightLayer1(group,0x24,1); //ON for LED: A1
				DNS1200.toggleLightLayer2(group,0x16,1); //ON for (: A1 Side
				DNS1200.toggleLightLayer2(group,0x18,1); //ON for ): A1 Side					
				DNS1200.toggleLightLayer2(group,0x1A,1); //ON for A1 Side					
				DNS1200.toggleLightLayer2(group,0x1C,1); //ON for B: A1 Side				
			}
			break;
		case 64: //EXIT / Reloop is pressed or released
			DNS1200.logInfo("EXIT is pressed channel:"+channel+" control:"+control+" value:"+value+" status:"+status+" group:"+group);
			if (value === 0) return;     // don't respond to note off messages
			if (DNS1200.Deck[group].flip_pressed) {
				DNS1200.Deck[group].hotcue_mode = !DNS1200.Deck[group].hotcue_mode;
				if (DNS1200.Deck[group].hotcue_mode) { //If Hot Cue Mode is enabled
					//DNS1200.displayTextLine1(group, "HotCue Mode");
					//DNS1200.displayTextLine2(group, "Enabled");
					DNS1200.displayTempText(group, 2000, "HotCue Mode", "Enabled");
					//Update LED
					DNS1200.updateHotCueLED(group);
				} else {
					//DNS1200.displayTextLine1(group, "HotCue Mode");
					//DNS1200.displayTextLine2(group, "Disabled");
					DNS1200.displayTempText(group, 2000, "HotCue Mode", "Disabled");
					//Update LED
					if (engine.getValue(group, "loop_enabled")) {
						DNS1200.toggleLightLayer1(group,0x24,1); //ON for LED: A1 
						DNS1200.toggleLightLayer2(group,0x16,1); //ON for (: A1 Side
						DNS1200.toggleLightLayer2(group,0x18,1); //ON for ): A1 Side					
					} else {
						DNS1200.toggleLightLayer1(group,0x3E,1); //ON for LED: A1 Dimmer
						DNS1200.toggleLightLayer2(group,0x16,2); //BLINK for (: A1 Side
						DNS1200.toggleLightLayer2(group,0x18,2); //BLINK for ): A1 Side					
					}
					
				}
			} else { 
				if (engine.getValue(group, "loop_end_position") !== -1) { //if a loop exists IE loop end position is set
					engine.setValue(group, "reloop_toggle", 1); //Toggle loop
					if (engine.getValue(group, "loop_enabled")) {
						DNS1200.toggleLightLayer1(group,0x24,1); //ON for LED: A1 
						DNS1200.toggleLightLayer2(group,0x16,1); //ON for (: A1 Side
						DNS1200.toggleLightLayer2(group,0x18,1); //ON for ): A1 Side					
					} else {
						DNS1200.toggleLightLayer1(group,0x3E,1); //ON for LED: A1 Dimmer
						DNS1200.toggleLightLayer2(group,0x16,2); //BLINK for (: A1 Side
						DNS1200.toggleLightLayer2(group,0x18,2); //BLINK for ): A1 Side					
					}
				}
			}
			//DNS1200.logInfo("loop_enable:"+engine.getValue(group, "loop_enabled"));
			DNS1200.logInfo("loop_end_position:"+engine.getValue(group, "loop_end_position"));
			//DNS1200.toggleLightLayer1(group,0x3E,1); //ON for LED: A1 Dimmer
			break;
		default:
			DNS1200.logInfo("Something was pressed channel:"+channel+" control:"+control+" value:"+value+" status:"+status+" group:"+group);
			break;
	}
 
}


// Callback for pressing loop in key
DNS1200.memoCallback = function (channel, control, value, status, group) {
	if (value === 0) return;     // don't respond to note off messages
	DNS1200.Deck[group].memo_pressed = !DNS1200.Deck[group].memo_pressed;
	if (DNS1200.Deck[group].memo_pressed) {
		DNS1200.displayTextLine1(group, "Memo");
	} else {
		DNS1200.displayTextLine1(group, "Desk N°"+DNS1200.Deck[group].engineChannel);
		DNS1200.displayTextLine2(group, "Derosa");
	}
}
// Control callback when track duration changes (new track is loaded)
// Update all other outputs as side effect, because track changed
DNS1200.durationCallback = function(value,group,key) {
    DNS1200.logInfo("durationCallback called: value:"+value+" group:"+group+" key:"+key);
    //Update track time display
    DNS1200.updateTrackTime(value, group);
    //var output_packet = DNS1200.controller.getOutputPacket("lights");
    //DNS1200.setDuration(value);
    //DNS1200.setBPM();
    //DNS1200.setRate();
    //DNS1200.setTime();
    //output_packet.send();
}

DNS1200.effectCallback = function (channel, control, value, status, group) {
    //Control return 20 for Filter, 19 for Flanger, 18 for Echo/loop
    //Deduce effect number from control
    var effectNum = control-17;
    //Set the Engine Parameter value matching with pressed button
    var effectParameter = "[EffectRack1_EffectUnit"+DNS1200.Deck[group].engineChannel+"_Effect"+effectNum+"]";
    //Toggle EffectRack&_EffectUnit1_Effect1
    //Get effect status
    var isEffectEnabled = engine.getParameter(effectParameter,"enabled");
    //If Effect if OFF
    //Then switch ON 
    if (!isEffectEnabled) {
        engine.setParameter(effectParameter, "enabled", 1);
        DNS1200.Deck[group].active_effect = effectNum;
        DNS1200.Deck[group].isVinylMode = false; //Switch off scratch mode
        DNS1200.toggleLightLayer1(group, 0x06, DNS1200.Deck[group].isVinylMode);
        DNS1200.metaKnob(group, 0);
    }
    //Else (effect if ON) if active effect if matching with numEffect 
    else if (DNS1200.Deck[group].active_effect === effectNum) {
    //Then switch OFF (User is trying to switch OFF active effect)
        engine.setParameter(effectParameter, "enabled", 0);
        DNS1200.Deck[group].active_effect = 0;
        DNS1200.updateEffectPositionDisplay(group, 0);
    }
    //Else (effect if ON) and is not active
    //change active effect var to focus on the numEffect
    else {
        DNS1200.Deck[group].active_effect = effectNum;
        DNS1200.Deck[group].isVinylMode = false; //Switch off scratch mode
        DNS1200.toggleLightLayer1(group, 0x06, DNS1200.Deck[group].isVinylMode);
        DNS1200.metaKnob(group, 0);
    }
    
    //Update Effect LED
    DNS1200.updateEffectLED(group);
    DNS1200.updateTextLines(group);
    //DNS1200.logInfo("****** channel:"+channel+" control:"+control+" value:"+value+" status:"+status);

/*  //PREVIOUS CODE    
    //Toggle Engine effect
    engine.setParameter(effectParameter, "enabled", isEffectEnabled ? 0 : 1);
    //Update active effect
    DNS1200.Deck["[Channel1]"].active_effect = isEffectEnabled ? 0 : effectNum;
*/
}

DNS1200.updateEffectLED = function (group) {
    var isEffect1Enabled = engine.getParameter("[EffectRack1_EffectUnit"+DNS1200.Deck[group].engineChannel+"_Effect1]","enabled");
    var isEffect2Enabled = engine.getParameter("[EffectRack1_EffectUnit"+DNS1200.Deck[group].engineChannel+"_Effect2]","enabled");
    var isEffect3Enabled = engine.getParameter("[EffectRack1_EffectUnit"+DNS1200.Deck[group].engineChannel+"_Effect3]","enabled");
    //Switch OFF or Blink all effects
    midi.sendShortMsg(DNS1200.MIDI_CH[group], isEffect1Enabled ? 0x4C : 0x4B, 0x0B); //11
    midi.sendShortMsg(DNS1200.MIDI_CH[group], isEffect2Enabled ? 0x4C : 0x4B, 0x0D); //13
    midi.sendShortMsg(DNS1200.MIDI_CH[group], isEffect3Enabled ? 0x4C : 0x4B, 0x0F); //15
    //Switch OFF or ON active effect 
    if (DNS1200.Deck[group].active_effect) {
        midi.sendShortMsg(DNS1200.MIDI_CH[group], 0x4A, 9+2*DNS1200.Deck[group].active_effect);
    }
}

DNS1200.updateHotCueLED = function (group) {
	var hotcue_1_enabled = engine.getValue(group, "hotcue_1_enabled");
	var hotcue_2_enabled = engine.getValue(group, "hotcue_2_enabled");
	var hotcue_3_enabled = engine.getValue(group, "hotcue_3_enabled");
	var hotcue_4_enabled = engine.getValue(group, "hotcue_4_enabled");
	DNS1200.toggleLightLayer1(group,0x24,hotcue_1_enabled); //for LED: A1
	DNS1200.toggleLightLayer2(group,0x16,hotcue_1_enabled); //for (: A1 Side
	DNS1200.toggleLightLayer2(group,0x1A,hotcue_1_enabled); //for A1 Side
	DNS1200.toggleLightLayer1(group,0x25,hotcue_2_enabled); //for LED: A2
	DNS1200.toggleLightLayer2(group,0x17,hotcue_2_enabled); //for (: A2 Side
	DNS1200.toggleLightLayer2(group,0x1B,hotcue_2_enabled); //for A2 Side
	DNS1200.toggleLightLayer2(group,0x1C,hotcue_3_enabled); //for B: A1 Side
	DNS1200.toggleLightLayer2(group,0x18,hotcue_3_enabled); //for ): A1 Side
	DNS1200.toggleLightLayer2(group,0x1D,hotcue_4_enabled); //for B: A2 Side
	DNS1200.toggleLightLayer2(group,0x19,hotcue_4_enabled); //for ): A2 Side
}

DNS1200.updateTextLines = function (group) {
    //DNS1200.logInfo("updateTextLines called: DNS1200.Deck[group].active_effect:"+DNS1200.Deck[group].active_effect);

    //If there is an active effect 
    if (DNS1200.Deck[group].active_effect) {
        //Display active effect
        var effectIndex = DNS1200.Deck[group].effect[DNS1200.Deck[group].active_effect];
        var effectName = DNS1200.myEffects[effectIndex]
        DNS1200.displayTextLine1(group,"Effect N°"+DNS1200.Deck[group].active_effect);
        DNS1200.displayTextLine2(group,effectName);
    }
    else {
        //Display Desk nunmber
        DNS1200.displayTextLine1(group, "Desk N°"+DNS1200.Deck[group].engineChannel);
        DNS1200.displayTextLine2(group, "Derosa");
    }

}

DNS1200.metaKnob = function (group, value) {
    var effectUnit = "[EffectRack1_EffectUnit"+DNS1200.Deck[group].engineChannel+"_Effect"+DNS1200.Deck[group].active_effect+"]";
    var knobValue = engine.getParameter(effectUnit,"meta");
    engine.setParameter(effectUnit,"meta",knobValue-value);
    DNS1200.updateEffectPositionDisplay(group, knobValue-value);
}

DNS1200.updateEffectPositionDisplay = function (group, knobValue) {
    //This function help in reproducing the level of meta knob with the RED circle of Denon Desk
    //(To conserve the same "Denon" spirit with denon effects)
    //value between 0 and 0.5 must be converted to int between 51 and 65
    //value between 0.5 and 1 must be converted to int between 34 and 46
    
    for (i=0, TRG=0x4D; i<31; i++) {
        if (i>=knobValue*26) TRG=0x4E;
        if (i<14) midi.sendShortMsg(DNS1200.MIDI_CH[group], TRG, i+52); //Scratch button i+18 
        if (i>=14) midi.sendShortMsg(DNS1200.MIDI_CH[group], TRG, i+20); //Scratch button i+18 
    }
//    DNS1200.logInfo("updateEffectPositionDisplay called: knobValue:"+knobValue);
}


DNS1200.parametersKnob = function (channel, control, value, status, group) {
    //Parameter Knob will allow to change active effect, to do so, select one of the DN-S1200 effect button
    // among Echo, Flanger or Filter
    //Then press and turn the Parameter Knob button
    //Release will activate chosen effect and load
    //DNS1200.logInfo("parametersKnob called: control:"+control+" value:"+value+" status:"+status);
    var effectIndex = DNS1200.Deck[group].effect[DNS1200.Deck[group].active_effect];
    var effectName = DNS1200.myEffects[effectIndex];
	var track_loaded = engine.getParameter(group, "track_loaded");
    switch(control) {
        case 40: //button is pressed or released
            DNS1200.Deck[group].paramKnobPressed = (value ? true : false);
			//Button is pressed
            if (DNS1200.Deck[group].paramKnobPressed) {
				//If no track isloaded
				if (!track_loaded) {
					engine.setParameter(group, "LoadSelectedTrack", true);
					DNS1200.toggleLightLayer1(group, 0x01, 1);
			        DNS1200.displayTextLine1(group, "Desk N°"+DNS1200.Deck[group].engineChannel);
					DNS1200.displayTextLine2(group, "Derosa");

				}
			}
			//if (!DNS1200.Deck[group].paramKnobPressed) {
			else {
                //Button is released => Update active effect
                DNS1200.updateEffect(DNS1200.Deck[group].engineChannel, DNS1200.Deck[group].active_effect, DNS1200.EFFECTS[effectName]);
            }
            break;
        case 84: //buton is turned
            //If there is an active effect AND knob is pressed, let's change the active effect
            if ((DNS1200.Deck[group].paramKnobPressed)&&(DNS1200.Deck[group].active_effect)) {
                //Let's display list of favourite effects
                //Get the value of effect matching with active effect
                
                effectIndex = (value ? effectIndex-1 : effectIndex+1)
                effectIndex = (effectIndex < 0) ? 0 : effectIndex;
                effectIndex = (effectIndex > DNS1200.myEffects.length-1) ? DNS1200.myEffects.length-1 : effectIndex;
                DNS1200.Deck[group].effect[DNS1200.Deck[group].active_effect] = effectIndex;
                
                //Update Text Lines
                DNS1200.updateTextLines(group);
                //DNS1200.logInfo("parametersKnob called: effectIndex:"+effectIndex+" effectName:"+effectName);
            }
			
			//If there is no track loaded let's move up and down the library
			if (!track_loaded) {
				//DNS1200.logInfo("parametersKnob called: control:"+control+" value:"+value+" status:"+status);
				engine.setParameter("[Library]","MoveVertical",(value > 0) ? 1 : -1);
			} else {
				//If track is loaded 
				if (engine.getValue(group, "play")) {//and Desk is playing
					if (engine.getValue(group, "loop_end_position") !== -1) { //if a loop exists IE loop end position is set
						var beatloop_size = engine.getValue(group, "beatloop_size");
						if (value) { //button is turned to the left
							//decrease beatloop_size
							beatloop_size = beatloop_size/2;
							if (beatloop_size<1/32) {
								beatloop_size = 1/32;
							}
						} else {
							beatloop_size = beatloop_size*2;
							if (beatloop_size>256) {
								beatloop_size = 256;
							}
						}
						engine.setValue(group, "beatloop_size", beatloop_size);
					}
				} else { //if Desk is not playing
					if (value) { //button is turned to the left
						engine.setParameter(group, "start", 1);
					}
				}
			}
            break;
    }
//    var Focused_effect = engine.getParameter("[EffectRack1_EffectUnit1]","focused_effect");
/*
    var effectUnit = "[EffectRack1_EffectUnit1_Effect"+DNS1200.Deck[group].active_effect+"]";
    var knobValue = engine.getParameter(effectUnit,"effect_selector");
    //value=127 means knob is turned counterclockwise
    //value=0 means knob is turned clockwise
    if (value) {
        engine.setParameter(effectUnit,"effect_selector",knobValue-1);
    } else engine.setParameter(effectUnit,"effect_selector",knobValue+1);
*/


}

DNS1200.testCallback = function (channel, control, value, status, group) {
	DNS1200.logInfo("testCallback called: control:"+control+" value:"+value+" status:"+status+" channel:"+channel+ " group:"+group);
	if (value) {// button pressed start timer
		//begin timer 
		DNS1200.pitchTimer = engine.beginTimer(1000,function() { DNS1200.pitchRangeChange(group); }, true);
	} else { //button released
		if (DNS1200.pitchTimer !== 0) { //if a timer is running, stop it
			engine.stopTimer(DNS1200.pitchTimer);
		}
		DNS1200.pitchTimer = 0; //reset timer
	}
}

DNS1200.pitchRangeChange = function (group) {
    // Rate range toggle button callback
    var currRateRange = engine.getValue(group, "rateRange");
	DNS1200.logInfo("pitchRangeChange called: currRateRange:"+currRateRange+" group:"+group);
	//engine.stopTimer(DNS1200.pitchTimer);
	DNS1200.pitchTimer = 0;
	engine.setValue(group, "rateRange", 0.5);

}

DNS1200.ejectButton = function (channel, control, value, status, group) {
	//Button released=> Do nothing
	if (value === 0) {
        return;
    }
	var track_loaded = engine.getParameter(group, "track_loaded");
	//DNS1200.logInfo("ejectButton called: track_loaded:"+track_loaded+" value:"+value+" status:"+status+" channel:"+channel+ " group:"+group);
	if (track_loaded) {
		var currentlyPlaying = engine.getValue(group, "play");
		if (currentlyPlaying) {
			DNS1200.displayTextLine1(group, "  Push Cue");
		}
		else {
			//Eject track from desk
			engine.setParameter(group, "eject", true);
			engine.setParameter("[EffectRack1_EffectUnit"+DNS1200.Deck[group].engineChannel+"_Effect1]","enabled",0); //Effet 1 to "Disabled"
			engine.setParameter("[EffectRack1_EffectUnit"+DNS1200.Deck[group].engineChannel+"_Effect2]","enabled",0); //Effet 2 to "Disabled"
			engine.setParameter("[EffectRack1_EffectUnit"+DNS1200.Deck[group].engineChannel+"_Effect3]","enabled",0); //Effet 3 to "Disabled"
			DNS1200.Deck[group].active_effect = 0;
			
			DNS1200.toggleLightLayer1(group, 0x01, 0);
			DNS1200.displayTextLine1(group, "Desk N°"+DNS1200.Deck[group].engineChannel);
			DNS1200.displayTextLine2(group, "No Track");
			DNS1200.Deck[group].hotcue_mode = false;
			DNS1200.updateHotCueLED(group);
			//Update Effect LED
			DNS1200.updateEffectLED(group);
			DNS1200.updateTextLines(group);
			engine.setParameter(group, "eject", false);
		}
	} 
	/*
	else { //No action if no track is loaded when pressing eject 
		//engine.setParameter(group, "LoadSelectedTrack", true);
	}
	*/
}

DNS1200.backCallback = function (channel, control, value, status, group) {
	//Button released=> Do nothing
	if (value === 0) {
        return;
    }
}

DNS1200.TAPCallback = function (channel, control, value, status, group) {
	DNS1200.Deck[group].TAP_pressed = (value !== 0);
}

DNS1200.pitchbendCallback = function (channel, control, value, status, group) {
	//DNS1200.logInfo("pitchbendCallback called: "+channel+" "+control+" "+value+" "+status+" "+group);
	//Button released=> Do nothing
	//if (value === 0) {
    //    return;
    //}
	if (DNS1200.Deck[group].TAP_pressed) {//Change pitch
		if (control===8) {//Button +
			engine.setParameter(group, "pitch_up", value);
		} else {//Button -
			engine.setParameter(group, "pitch_down", value);
		}
		//need to wait few miliseconds before displaying key change (time for engine to change it)
		engine.beginTimer(50,function() { DNS1200.displayKeyText(group) }, true);
	} else if (control===8) {//Button + without TAP pressed
			engine.setParameter(group, "rate_temp_up", (value!==0));
		} else {//Button -
			engine.setParameter(group, "rate_temp_down", (value!==0));
		}

}

DNS1200.fwdCallback = function (channel, control, value, status, group) {
	//Button released=> Do nothing
	/*if (value === 0) {
        return;
    }*/
    if (engine.getValue(group, "play")) {//If desk is playing
        engine.setValue(group, "beatjump_forward", (value>0));    
    } else if (engine.getParameter(group, "track_loaded")) {//If track is loaded
        engine.setValue(group, "fwd", (value>0));
    } else { //No track loaded let's switch focus
        engine.setValue("[Library]", "MoveFocusForward", (value>0));
    }
}

DNS1200.rewCallback = function (channel, control, value, status, group) {
	//Button released=> Do nothing
	//if (value === 0) {
    //    return;
    //}
    if (engine.getValue(group, "play")) {//If desk is playing
        engine.setValue(group, "beatjump_backward", (value>0));    
    } else if (engine.getParameter(group, "track_loaded")) {//If track is loaded
        engine.setValue(group, "back", (value>0));
    }
    else {
        engine.setValue("[Library]", "MoveFocusBackward", (value>0));
    }
}

DNS1200.pitchkeyCallback = function (channel, control, value, status, group) {
	if (value) {// button pressed start timer
		//begin timer 
		DNS1200.pitchTimer = engine.beginTimer(1000,function() { DNS1200.pitchRangeChange(group); }, true);
	} else { //button released
		if (DNS1200.pitchTimer !== 0) { //if a timer is running, means button was released before one second - classic press
			//stop the timer 
			engine.stopTimer(DNS1200.pitchTimer);
			//Launch action
			DNS1200.switchPitchkeyMode(group);
		}
		DNS1200.pitchTimer = 0; //reset timer
	}
}

DNS1200.switchPitchkeyMode = function (group) {
	DNS1200.Deck[group].pitchkey_mode = (DNS1200.Deck[group].pitchkey_mode === false);
	DNS1200.updatepitchkeyLED(group);
	engine.setParameter(group, "keylock", DNS1200.Deck[group].pitchkey_mode);
/*	switch(DNS1200.Deck[group].pitchkey_mode) {
		case 0 : //Off => switch On
			DNS1200.Deck[group].pitchkey_mode = 1;
			engine.setParameter(group, "keylock", true);
			//engine.getParameter(group, "reset_key", true);
			break;
		case 1 : //On => Switch Manual
			DNS1200.Deck[group].pitchkey_mode = 2;
			engine.setParameter(group, "keylock", true);
			var currentKey = engine.getParameter(group,"key");
			DNS1200.logInfo("currentKey;"+currentKey);
			break;
		case 2 : //Manual => Switch Off
			DNS1200.Deck[group].pitchkey_mode = 0;
			engine.setParameter(group, "keylock", false);
			break;
	}
	DNS1200.toggleLightLayer1(group, 0x07, DNS1200.Deck[group].pitchkey_mode);
	//DNS1200.Deck[group].pitchkey_mode = 1;
*/
}

DNS1200.updateEffect = function (engineChannel, active_effect, effectIndex) {
	DNS1200.logInfo("updateEffect called: engineChannel:"+engineChannel+" active_effect:"+active_effect+" effectIndex:"+effectIndex);
    //This function will update the mixxx engine effect
    //using values of active_effect to definewhich effect must be change in the effect unit
    //using value of effectIndex to define the needed effect
    //Method is to clear active effect and then go step by step until wanted effect is reached
    var effectUnit = "[EffectRack1_EffectUnit"+engineChannel+"_Effect"+active_effect+"]";
	DNS1200.logInfo("effectUnit:"+effectUnit);
	
    //Clear effect
    DNS1200.logInfo("Clear effect");
	engine.setParameter(effectUnit,"clear",true);
	DNS1200.logInfo("Place meta to middle");
    //TO DO create a tab for default value for meta depending on selected effect
    //Turn next effect until wanted effect is selected
    DNS1200.logInfo("Turn next effect");
	for (i = 0; i < effectIndex; i++) {
        engine.setParameter(effectUnit,"effect_selector",1);    
    } 
    //Place meta to middle value (prevent bad result when changing effect during play)
    engine.setParameter(effectUnit,"meta",0.5);
}



DNS1200.playButton = function (channel, control, value, status, group) {
    //DNS1200.logInfo("playButton called: channel:"+channel+" control:"+control+" value:"+value+" status:"+status+" group:"+group);
    //channel:0 control:67 value:64 status:144 group:[Channel1]
    //status 0x90 (ch 1, opcode 0x9), ctrl 0x43, val 0x40
    // Only respond to presses.
    if (value === 0) {
        return;
    }
    //var channelname = DNS1200.groupForChannel(channel);
    var currentlyPlaying = engine.getValue(group, "play");
    var deck = parseInt(group.substring(8,9)); // work out which deck we are using 

    // Toggle it.
    if (currentlyPlaying) { //Track is playing
        if (DNS1200.Deck[group].brake_mode) { //Brake mode is enabled
            //engine.brake(deck, DNS1200.Deck[group].brake_mode, 1.2, -12); // Launch Brake effect
			engine.brake(deck, DNS1200.Deck[group].brake_mode); // Launch Brake effect
			DNS1200.logInfo("playButton called v3: engine.brake(deck:"+deck+" DNS1200.Deck[group].brake_mode:"+DNS1200.Deck[group].brake_mode);
        } else {
            engine.setValue(group, "play", 0.0); // Or simply stop playing
        }
    } else { //Track is on pause
        if (DNS1200.Deck[group].brake_mode) { //Brake mode is enabled
            engine.softStart(deck, true); // Launch Soft Start effect
        } else {
            engine.setValue(group, "play", 1.0); // Or simply start playing
        }
    }
    //DNS1200.playChanged(value, group);

}

DNS1200.playChanged = function (value, group) {
    DNS1200.logInfo("playChanged called: value:"+value+" group:"+group);

    var deck = parseInt(group.substring(8,9)); // work out which deck we are using 

    var currentlyPlaying = engine.getValue(group, "play");
    if (currentlyPlaying === 1) {
        // Disable scratch mode, don't ramp.
        engine.scratchDisable(deck, false);
    } else {
        // Scratch on, don't ramp.
        DNS1200.scratchEnable(deck, false);
        // Reset brake. XXX: HACK;
        //DNS1200.brake(deck - 1, 0, 1, 1);
    }
}

DNS1200.rateDisplay = function (value, group) {
    var rateDir = engine.getValue(group, "rate_dir");
    var raterange = engine.getValue(group, "rateRange");
    var rate = engine.getValue(group, "rate");
    var slider_rate = ((rate * raterange) * 100) * rateDir;
    var rate_abs = Math.abs(slider_rate);
    var rate_dec = Math.floor(rate_abs);
    var rate_frac = Math.round((rate_abs - rate_dec) * 100);
    // MM.LL
    midi.sendShortMsg(DNS1200.MIDI_CH[group], 0x46, rate_dec);
    midi.sendShortMsg(DNS1200.MIDI_CH[group], 0x47, rate_frac);

    // +/- symbol
    if (rate > 0) {
        midi.sendShortMsg(DNS1200.MIDI_CH[group], 0x45, 0x02); //Display +
    } else if (rate < 0) {
        midi.sendShortMsg(DNS1200.MIDI_CH[group], 0x45, 0x01); //Display -
    } else {
        midi.sendShortMsg(DNS1200.MIDI_CH[group], 0x45, 0x00); //Display nothing
    }

    // BPM
    var bpm = engine.getValue(group, "bpm");
	midi.sendShortMsg(DNS1200.MIDI_CH[this.group], 0x4D, 0x06); //OFF for VFD Symbol: BPM

    DNS1200.displayTextLine2(group, "BPM:"+bpm.toFixed(2));
    // bpm display is split like MM.LL
    //DNS1200.logInfo("rateDisplay called: bpm_dec:"+bpm_dec+" bpm_frac:"+bpm_frac+" bpm:"+bpm.toFixed(2));

}

DNS1200.playPositionChanged = function (value, group) {

	//PitchKeyLED
	DNS1200.updatepitchkeyLED(group);
	
	//BrakeLED
	DNS1200.updatebrakeLED(group);

    // Track percentage position.
    DNS1200.updateTrackPosition(value, group);

    //Track Time       
    DNS1200.updateTrackTime(value, group);
}

DNS1200.updateTrackPosition = function (value, group) {
//    DNS1200.logInfo("updateTrackPosition called: value:"+value+" group:"+group+" remain_mode:"+DNS1200.Deck[group].remain_mode);
    var track_position = engine.getValue(group, "playposition");

    // Track percentage position.
    var reversed = engine.getValue(group, "reverse");
    if (reversed) {
        midi.sendShortMsg(DNS1200.MIDI_CH[group], 0x49, Math.round(track_position * 100));
    } else {
        midi.sendShortMsg(DNS1200.MIDI_CH[group], 0x48, Math.round(track_position * 100));
    }
}

DNS1200.updatepitchkeyLED = function (group) {
	if (DNS1200.Deck[group].pitchkey_mode)
	{
		var currentKey = engine.getParameter(group,"key");
		var fileKey = engine.getParameter(group,"file_key");
		var newStatus = (currentKey-fileKey === 0) ? 1 : 2;
		DNS1200.logInfo("updatepitchkeyLED called: currentKey:"+currentKey+" fileKey:"+fileKey+" newStatus:"+newStatus);
	} else var newStatus = 0;
	DNS1200.toggleLightLayer1(group, 0x07, newStatus);
}

DNS1200.updatebrakeLED = function (group) {
	//Update LED: Brake
	//midi.sendShortMsg(DNS1200.MIDI_CH[group], DNS1200.Deck[group].brake_mode ? 0x4A : 0x4B, 0x28);
	DNS1200.toggleLightLayer1(group, 0x28, DNS1200.Deck[group].brake_mode);
}

DNS1200.updateTrackTime = function (value, group) {
   
    //DNS1200.logInfo("updateTrackTime called: value:"+value+" group:"+group+" remain_mode:"+DNS1200.Deck[group].remain_mode);

    var track_length = engine.getValue(group, "duration");
    var track_position = engine.getValue(group, "playposition");
    if (DNS1200.Deck[group].remain_mode) {
        if (track_position>=1) {
            minutes = 110; seconds = 110; frames = 110; //Will display "- - -"
        } else {
            var position = track_length - track_length*track_position;
        }
    } else {
        if (track_position<=0) {
            position = 0; minutes = 0; seconds = 0;
        } else {
            var position = track_length*track_position;
        }
    }
 
    // Time position.
    // mm:ss.ff
    var minutes = Math.floor(position/60);
    var seconds = Math.floor(position%60);
    var frames = Math.floor((position-Math.floor(position))*100);
    
    DNS1200.displayTrackTime(DNS1200.MIDI_CH[group], minutes, seconds, frames);
}

DNS1200.displayKeyText = function (group) {
	var currentKey = engine.getParameter(group,"key");
	var fileKey = engine.getParameter(group,"file_key");
	var diffKey = currentKey-fileKey;
	//DNS1200.logInfo("pitchbendCallback called: beforeKey:"+beforeKey+" currentKey:"+currentKey+" afterKey:"+afterKey);
	//DNS1200.displayTempText(group, 2000, "Key Changed", DNS1200.keyTrans[currentKey]+" ["+currentKey+"-"+fileKey+"="+diffKey+"]");
	DNS1200.displayTempText(group, 2000, "Key Changed", DNS1200.keyTrans[currentKey]+" ["+diffKey+"]");
}

DNS1200.displayTrackTime = function (channelmidi, pos_minutes, pos_secs, pos_frac) {
    midi.sendShortMsg(channelmidi, 0x42, pos_minutes); //Time Minute OK
    midi.sendShortMsg(channelmidi, 0x43, pos_secs);
    midi.sendShortMsg(channelmidi, 0x44, pos_frac);
}

DNS1200.displayTempText = function (group, displayTime, line1, line2) {
	//if (DNS1200.Deck[group].displayTempTextTimer === 0) { //No text is actually temporary displayed
		DNS1200.logInfo("Called displayTempText and group:"+group+" displayTime:"+displayTime+" line1:"+line1);
		//launch restore default text message procedure
		DNS1200.Deck[group].displayTempTextTimer = engine.beginTimer(displayTime,function() { DNS1200.restoreText(group); }, true);  
		//Display text according parameters line1 & line2
		DNS1200.displayText(group, line1, line2);
	//}
}

DNS1200.restoreText = function (group) {
	DNS1200.displayText(group, "Desk N°"+DNS1200.Deck[group].engineChannel, "Derosa");
	DNS1200.Deck[group].displayTempTextTimer = 0;
}

DNS1200.displayText = function (group, line1, line2) {
	DNS1200.displayTextLine1(group, line1);
	DNS1200.displayTextLine2(group, line2);
}


DNS1200.displayTextLine1 = function (group, textToDisplay) {
    var MSB = 0x01;
    var LSB = 0x21;
    //Write text
    for (i = 0, len = textToDisplay.length; i < len; i++) { 
        var hexval = textToDisplay.charCodeAt(i).toString(16);
        var jump = (i>3) ? 1 : 0; //Can't explain why but there is a whole for char5 in Denon HID only for Line1
        midi.sendShortMsg(DNS1200.MIDI_CH[group], MSB+i+jump, "0x0"+hexval[0]); //Send left part of ASCII value to MSB
        midi.sendShortMsg(DNS1200.MIDI_CH[group], LSB+i+jump, "0x0"+hexval[1]); //Send left part of ASCII value to LSB
    }
    //Complete with space to erase previous text written
    for (i = textToDisplay.length+jump; i < 13; i++) { 
        midi.sendShortMsg(DNS1200.MIDI_CH[group], MSB+i, "0x02"); //Send left part of ASCII value to MSB
        midi.sendShortMsg(DNS1200.MIDI_CH[group], LSB+i, "0x00"); //Send left part of ASCII value to LSB
    }
}    

DNS1200.displayTextLine2 = function (group, textToDisplay) {
    var MSB = 0x0E;
    var LSB = 0x2E;
    for (i = 0, len = textToDisplay.length; i < len; i++) { 
        var hexval = textToDisplay.charCodeAt(i).toString(16);
        midi.sendShortMsg(DNS1200.MIDI_CH[group], MSB+i, "0x0"+hexval[0]); //Send left part of ASCII value to MSB
        midi.sendShortMsg(DNS1200.MIDI_CH[group], LSB+i, "0x0"+hexval[1]); //Send left part of ASCII value to LSB
    }
    for (i = textToDisplay.length; i < 12; i++) { 
        midi.sendShortMsg(DNS1200.MIDI_CH[group], MSB+i, "0x02"); //Send left part of ASCII value to MSB
        midi.sendShortMsg(DNS1200.MIDI_CH[group], LSB+i, "0x00"); //Send left part of ASCII value to LSB
    }

}    

DNS1200.scratchEnable = function (deck, ramp) {
    // Try lower damp values for more responsive scratching.
    var damp_value = 32;
    var alpha = 1.0 / damp_value;
    var beta = alpha / damp_value;
    engine.scratchEnable(deck, 1480, 33+1/3, alpha, beta, ramp);
}

/***************************************************************/
/* HID MANAGEMENT                                              */
/***************************************************************/

DNS1200.initDeckLEDS = function (group) {
	DNS1200.logInfo("Called initDeckLEDS and group:"+group);
    //Initialize LEDs - STEP 1 - Switch All Off 
	for (i = 0x01; i < 0x41; i++) {
		DNS1200.toggleLightLayer2(group, i, DNS1200.LIGHT_OFF);
	    DNS1200.logInfo("toggleLightLayer2("+i+")");
	}
	//Sequence for Light On
	DNS1200.toggleLightLayer2(group, 0x02, DNS1200.LIGHT_ON); 
	DNS1200.toggleLightLayer2(group, 0x05, DNS1200.LIGHT_ON); //ON  for VFD Symbol: SINGLE
	DNS1200.toggleLightLayer2(group, 0x07, DNS1200.LIGHT_ON); //ON  for VFD Symbol: m
	DNS1200.toggleLightLayer2(group, 0x08, DNS1200.LIGHT_ON); //ON  for VFD Symbol: s
	DNS1200.toggleLightLayer2(group, 0x09, DNS1200.LIGHT_ON); //ON  for VFD Symbol: f
	DNS1200.toggleLightLayer2(group, 0x0B, DNS1200.LIGHT_ON); //ON  for VFD Symbol: Pitch dot center
	DNS1200.toggleLightLayer2(group, 0x1E, DNS1200.LIGHT_ON); //ON  for Scratch Ring Outside
	DNS1200.toggleLightLayer2(group, 0x1F, DNS1200.LIGHT_ON); //ON  for Scratch Ring Inside
	DNS1200.toggleLightLayer2(group, 0x22, DNS1200.LIGHT_ON); //ON  for VFD Symbol: Scratch Position 1 (Top right)
    
    //Initialize LED for default switch on 
    //Initialize LEDs - STEP 1 - Switch All Off 
/*
	for (i = 0x01; i < 0x41; i++) {
		DNS1200.toggleLightLayer1(group, i, DNS1200.LIGHT_OFF);
	
*/
	var listLight = {1:0x01, 2:0x06, 3:0x07, 4:0x0B, 5:0x0D, 6:0x0F, 7:0x1E, 8:0x24, 9:0x3E, 10:0x25, 11:0x3F, 12:0x26, 13:0x27, 14:0x28, 15:0x29, 16:0x3A, 17:0x3C};
	for (i in listLight) {
		DNS1200.toggleLightLayer1(group, listLight[i], DNS1200.LIGHT_OFF);
	}
	DNS1200.toggleLightLayer1(group, 0x01, DNS1200.LIGHT_ON); //ON  for LED: Disc Eject
	DNS1200.toggleLightLayer1(group, 0x06, DNS1200.LIGHT_ON); //ON  for LED: JOG Mode
	DNS1200.toggleLightLayer1(group, 0x07, DNS1200.LIGHT_ON); //ON  for LED: Pitch / KEY
}

/***************************************************************/
/* LIGHT MANAGEMENT - LED                                      */
/*                                                             */
DNS1200.toggleLightLayer1 = function (group, light, status) {
	switch(status) {
		case 0:
		case false:
			midi.sendShortMsg(DNS1200.MIDI_CH[group], 0x4B, light); //Switch off LED
			break;
		case 1:
		case true:
			midi.sendShortMsg(DNS1200.MIDI_CH[group], 0x4A, light); //Switch on LED
			break;
		case 2:
			midi.sendShortMsg(DNS1200.MIDI_CH[group], 0x4C, light); //Blink LED
			break;
		}
}

/***************************************************************/
/* LIGHT MANAGEMENT - VFD Symbol                               */
/*                                                             */
DNS1200.toggleLightLayer2 = function (group, light, status) {
	DNS1200.logInfo("Called: toggleLightLayer2(group:"+group+" light:"+light+" status:"+status+")");
	switch(status) {
		case 0:
		case false:
			midi.sendShortMsg(DNS1200.MIDI_CH[group], 0x4E, light); //Switch off
			break;
		case 1:
		case true:
			midi.sendShortMsg(DNS1200.MIDI_CH[group], 0x4D, light); //Switch on
			break;
		case 2:
			midi.sendShortMsg(DNS1200.MIDI_CH[group], 0x4F, light); //Blink
			break;
	}
/*	
    if (status > 0) {
        midi.sendShortMsg(DNS1200.MIDI_CH[group], 0x4D, light);
    } else {
        midi.sendShortMsg(DNS1200.MIDI_CH[group], 0x4E, light);
    }
*/
}

DNS1200.playLight = function (value, group) {
//    DNS1200.logInfo("playLight called: value:"+value+" group:"+group);
    DNS1200.toggleLightLayer1(group, 0x27, value);
}

DNS1200.cueLight = function (value, group) {
//    DNS1200.logInfo("cueLight called: value:"+value+" group:"+group);
    DNS1200.toggleLightLayer1(group, 0x26, value);
}

DNS1200.reverseLight = function (value, group) {
    DNS1200.toggleLightLayer1(group, 0x3A, value);
}

DNS1200.dumpLight = function (value, group) {
    DNS1200.toggleLightLayer1(group, 0x29, value);
}

/************************************************************************************************************************************/
/* Debug functions */
function sleep(milliseconds) {
  var start = new Date().getTime();
  for (var i = 0; i < 1e7; i++) {
    if ((new Date().getTime() - start) > milliseconds){
      break;
    }
  }
}

function CheckAndDebug() {
        
    //Trying to turn On All LEDS
    // turn on all LEDs
    for (var i = 1; i <= 200; i++) { // Repeat the following code for the numbers 1 through 40
        midi.sendShortMsg(0xB0, i, 0);
        //sleep(1000);
    }
    
    DNS1200.logInfo("Trying to display '10' on Track Number");
    midi.sendShortMsg(0xB0, 0x41, 10); //Track Number OK
    DNS1200.logInfo("Trying to display '03' on Time Minute");
    midi.sendShortMsg(0xB0, 0x42, 03); //Time Minute OK
    DNS1200.logInfo("Trying to set Track position to 40% Normal");
    midi.sendShortMsg(0xB0, 0x48, 40); //Track position normal
    DNS1200.logInfo("Trying to set Track position to 30% Reverse");
    midi.sendShortMsg(0xB0, 0x48, 10); //Track position reverse
    DNS1200.logInfo("Trying to switch On Scratch");
    midi.sendShortMsg(0xB0, 0x4D, 0x22); //Scratch button
    DNS1200.logInfo("Trying to switch On Disc Eject");
    midi.sendShortMsg(0xB0, 0x4A, 0x01); //Disc Eject
    // Customize components

}