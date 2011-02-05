function Synth(sampleRate) {

	CHANNEL_COUNT = 16;
	
	function SineGenerator(freq) {
		var self = {'alive': true};
		var period = sampleRate / freq;
		var t = 0;
		
		self.read = function() {
			var phase = t / period;
			var result = Math.sin(phase * 2 * Math.PI);
			t++;
			return [result, result];
		}
		return self;
	}
	function AttackDecayGenerator(child, attackTimeS, decayTimeS, amplitude) {
		var self = {'alive': true}
		var attackTime = sampleRate * attackTimeS;
		var decayTime = sampleRate * decayTimeS;
		var t = 0;
		
		self.read = function() {
			if (!self.alive) return [0,0];
			var input = child.read();
			self.alive = child.alive;
			
			if (t < attackTime) {
				var localAmplitude = amplitude * (t / attackTime);
			} else {
				var localAmplitude = amplitude * (1 - (t - attackTime) / decayTime);
				if (localAmplitude <= 0) {
					self.alive = false;
					return [0,0];
				}
			}
			
			t++;
			return [localAmplitude * input[0], localAmplitude * input[1]];
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
		
		function read() {
			var v = [0,0];
			for (note in generatorsByNote) {
				var r = generatorsByNote[note].read();
				v[0] += r[0]; v[1] += r[1];
			}
			return v;
		}
		
		return {
			'noteOn': noteOn,
			'noteOff': noteOff,
			'setProgram': setProgram,
			'read': read
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
		for (; samplesToGenerate; samplesToGenerate--) {
			var l = 0;
			var r = 0;
			for (var j = 0; j < CHANNEL_COUNT; j++) {
				var s = channels[j].read();
				l += s[0]; r += s[1];
			}
			buffer[offset++] = l;
			buffer[offset++] = r;
		}
	}
	
	return {
		'sampleRate': sampleRate,
		'channels': channels,
		'generate': generate,
		'generateIntoBuffer': generateIntoBuffer
	}
}
