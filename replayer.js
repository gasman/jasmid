function Replayer(midiFile) {
	var trackStates = [];
	var beatsPerMinute = 120;
	var ticksPerBeat = midiFile.header.ticksPerBeat;
	
	for (var i = 0; i < midiFile.tracks.length; i++) {
		trackStates[i] = {
			'nextEventIndex': 0,
			'ticksToNextEvent': (
				midiFile.tracks[i].length ?
					midiFile.tracks[i][0].deltaTime :
					null
			)
		};
	}
	
	function getNextEvent() {
		var ticksToNextEvent = null;
		var nextEventTrack = null;
		var nextEventIndex = null;
		//console.log(trackStates);
		
		for (var i = 0; i < trackStates.length; i++) {
			// console.log(i + ': ' + trackStates[i].nextEventIndex + ', ' + trackStates[i].ticksToNextEvent);
			if (
				trackStates[i].ticksToNextEvent != null
				&& (ticksToNextEvent == null || trackStates[i].ticksToNextEvent < ticksToNextEvent)
			) {
				ticksToNextEvent = trackStates[i].ticksToNextEvent;
				nextEventTrack = i;
				nextEventIndex = trackStates[i].nextEventIndex;
			}
		}
		if (nextEventTrack != null) {
			/* consume event from that track */
			var nextEvent = midiFile.tracks[nextEventTrack][nextEventIndex];
			if (midiFile.tracks[nextEventTrack][nextEventIndex + 1]) {
				trackStates[nextEventTrack].ticksToNextEvent += midiFile.tracks[nextEventTrack][nextEventIndex + 1].deltaTime;
			} else {
				trackStates[nextEventTrack].ticksToNextEvent = null;
			}
			trackStates[nextEventTrack].nextEventIndex += 1;
			/* advance timings on all tracks by ticksToNextEvent */
			for (var i = 0; i < trackStates.length; i++) {
				if (trackStates[i].ticksToNextEvent != null) {
					trackStates[i].ticksToNextEvent -= ticksToNextEvent
				}
			}
			return {
				'ticksToEvent': ticksToNextEvent,
				'event': nextEvent,
				'track': nextEventTrack
			}
		} else {
			return null;
		}
	}
	
	function replay(synth, audio) {
		var eventInfo;
		var sampleRate = synth.sampleRate;
		var overshoot = 0;
		var eventCount = 0;
		while (eventInfo = getNextEvent()) {
			if (eventInfo.ticksToEvent > 0) {
				var beatsToGenerate = eventInfo.ticksToEvent / ticksPerBeat;
				var secondsToGenerate = beatsToGenerate / (beatsPerMinute / 60);
				var samplesToGenerate = secondsToGenerate * synth.sampleRate + overshoot;
				var fullSamplesToGenerate = Math.floor(samplesToGenerate);
				overshoot = samplesToGenerate - fullSamplesToGenerate;
				audio.write(synth.generate(fullSamplesToGenerate));
			}
			var event = eventInfo.event;
			switch (event.type) {
				case 'meta':
					switch (event.subtype) {
						case 'setTempo':
							beatsPerMinute = 60000000 / event.microsecondsPerBeat
					}
					break;
				case 'channel':
					switch (event.subtype) {
						case 'noteOn':
							synth.channels[event.channel].noteOn(event.noteNumber, event.velocity);
							break;
						case 'noteOff':
							synth.channels[event.channel].noteOff(event.noteNumber, event.velocity);
							break;
						case 'programChange':
							console.log('program change to ' + event.programNumber);
							synth.channels[event.channel].setProgram(event.programNumber);
							break;
					}
					break;
			}
			eventCount += 1;
			//if (eventCount > 100) return;
		}
	}
	
	return {
		'getNextEvent': getNextEvent,
		'replay': replay
	}
}
