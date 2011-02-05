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

function PianoProgram(note, velocity) {
	var frequency = 440 * Math.pow(2, (note-57)/12);
	return AttackDecayGenerator(
		SineGenerator(frequency),
		0.01, 0.75, 0.5 * (velocity / 128)
	);
}
function StringProgram(note, velocity) {
	var frequency = 440 * Math.pow(2, (note-57)/12);
	return AttackDecayGenerator(
		SineGenerator(frequency),
		0.4, 1, 0.5 * (velocity / 128)
	);
}

PROGRAMS = {
	41: StringProgram,
	42: StringProgram,
	43: StringProgram,
	44: StringProgram,
	45: StringProgram,
	46: StringProgram,
	47: StringProgram,
	49: StringProgram,
	50: StringProgram
};

function Synth(sampleRate) {
	
	var generators = [];
	
	function addGenerator(generator) {
		generators.push(generator);
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
		for (var i = generators.length - 1; i >= 0; i--) {
			generators[i].generate(buffer, offset, samplesToGenerate);
			if (!generators[i].alive) generators.splice(i, 1);
		}
	}
	
	return {
		'sampleRate': sampleRate,
		'addGenerator': addGenerator,
		'generate': generate,
		'generateIntoBuffer': generateIntoBuffer
	}
}
