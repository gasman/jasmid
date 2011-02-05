var sampleRate = 44100; /* hard-coded in Flash player */

function AudioPlayer(generator) {
	var audioElement = new Audio();
	if (audioElement.mozSetup) {
		audioElement.mozSetup(2, sampleRate); /* channels, sample rate */
		
		var buffer = []; /* data generated but not yet written */
		var minBufferLength = 1 * 2 * sampleRate; /* refill buffer when there are only this many elements remaining */
		var bufferFillLength = 1 * sampleRate;
		
		/* try to write what's in the buffer; if we can't clear it, try again in 20ms.
			Assumes that buffer != null (if it is null, why on earth are you calling this?)
		*/
		function checkBuffer() {
			if (buffer.length) {
				var written = audioElement.mozWriteAudio(buffer);
				buffer = buffer.slice(written);
			}
			if (buffer.length < minBufferLength && !generator.finished) {
				buffer = buffer.concat(generator.generate(bufferFillLength));
			}
			if (!generator.finished || buffer.length) {
				setTimeout(checkBuffer, 100);
			}
		}
		checkBuffer();
		
		return {
		}
	} else {
		// Fall back to creating flash player
		var c = document.createElement('div');
		c.innerHTML = '<embed type="application/x-shockwave-flash" id="da-swf" src="da.swf" width="8" height="8" allowScriptAccess="always" style="position: fixed; left:-10px;" />';
		document.body.appendChild(c);
		var swf = document.getElementById('da-swf');
		
		var minBufferDuration = 1000; /* refill buffer when there are only this many ms remaining */
		var bufferFillLength = 1 * sampleRate;
		
		function write(data) {
			var out = new Array(data.length);
			for (var i = data.length-1; i != 0; i--) {
				out[i] = Math.floor(data[i]*32768);
			}
			return swf.write(out.join(' '));
		}
		
		function checkBuffer() {
			if (swf.bufferedDuration() < minBufferDuration) {
				write(generator.generate(bufferFillLength));
			};
			if (!generator.finished) setTimeout(checkBuffer, 100);
		}
		
		function checkReady() {
			if (swf.write) {
				checkBuffer();
			} else {
				setTimeout(checkReady, 10);
			}
		}
		checkReady();
		
		return {
			'stop': function() {
				swf.stop();
			},
			'bufferedDuration': function() {
				return swf.bufferedDuration();
			},
		}
	}
}
