function Synth(sampleRate) {

	CHANNEL_COUNT = 16;
	
	function SineGenerator(freq) {
		var self = {'alive': true};
		var period = sampleRate / freq;
		var t = 0;
		
		self.generate = function(buf, offset, count) {
			for (; count; count--) {
				var phase = t / period;
				var result = Math.sin(phase * 2 * Math.PI);
				buf[offset++] += result;
				buf[offset++] += result;
				t++;
			}
		}
		
		return self;
	}
	function AttackDecayGenerator(child, attackTimeS, decayTimeS, amplitude) {
		var self = {'alive': true}
		var attackTime = sampleRate * attackTimeS;
		var decayTime = sampleRate * decayTimeS;
		var t = 0;
		
		self.generate = function(buf, offset, count) {
			if (!self.alive) return;
			var input = new Array(count * 2);
			for (var i = 0; i < count*2; i++) {
				input[i] = 0;
			}
			child.generate(input, 0, count);
			
			childOffset = 0;
			for (; count; count--) {
				if (t < attackTime) {
					var localAmplitude = amplitude * (t / attackTime);
				} else {
					var localAmplitude = amplitude * (1 - (t - attackTime) / decayTime);
					if (localAmplitude <= 0) {
						self.alive = false;
						return;
					}
				}
				
				buf[offset++] += input[childOffset++] * localAmplitude;
				buf[offset++] += input[childOffset++] * localAmplitude;
				t++;
			}
		}
		
		return self;
	}
	
	function PianoGenerator(frequency, velocity) {
		return AttackDecayGenerator(
			SineGenerator(frequency),
			0.01, 0.75, 0.5 * (velocity / 128)
		);
	}
	function StringGenerator(frequency, velocity) {
		return AttackDecayGenerator(
			SineGenerator(frequency),
			0.4, 1, 0.5 * (velocity / 128)
		);
	}
	
	PROGRAMS = {
		41: StringGenerator,
		42: StringGenerator,
		43: StringGenerator,
		44: StringGenerator,
		45: StringGenerator,
		46: StringGenerator,
		47: StringGenerator,
		49: StringGenerator,
		50: StringGenerator
	};
	
	function Channel() {
		
		var generatorsByNote = {};
		var currentProgram = PianoGenerator;
		
		function noteOn(note, velocity) {
			// console.log('note on - velocity ' + velocity);
			var frequency = 440 * Math.pow(2, (note-57)/12)
			generatorsByNote[note] = currentProgram(frequency, velocity);
		}
		function noteOff(note, velocity) {
			delete(generatorsByNote[note]);
		}
		function setProgram(programNumber) {
			currentProgram = PROGRAMS[programNumber] || PianoGenerator;
		}
		
		function generate(buf, offset, count) {
			for (note in generatorsByNote) {
				generatorsByNote[note].generate(buf, offset, count);
			}
		}
		
		return {
			'noteOn': noteOn,
			'noteOff': noteOff,
			'setProgram': setProgram,
			'generate': generate
		}
	}
	
	var channels = [];
	for (var i = 0; i < CHANNEL_COUNT; i++) {
		channels[i] = Channel();
	}
	
	function generate(samples) {
		//console.log('generating ' + samples + ' samples');
		var data = new Array(samples*2);
		generateIntoBuffer(samples, data, 0);
		return data;
	}
	
	function generateIntoBuffer(samplesToGenerate, buffer, offset) {
		for (var i = offset; i < offset + samplesToGenerate * 2; i++) {
			buffer[i] = 0;
		}
		for (var j = 0; j < CHANNEL_COUNT; j++) {
			channels[j].generate(buffer, offset, samplesToGenerate);
		}
	}
	
	return {
		'sampleRate': sampleRate,
		'channels': channels,
		'generate': generate,
		'generateIntoBuffer': generateIntoBuffer
	}
}
