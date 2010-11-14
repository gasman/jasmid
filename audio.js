var sampleRate = 44100; /* hard-coded in Flash player */

function AudioPlayer() {
	var audioElement = new Audio();
	if (audioElement.mozSetup) {
		audioElement.mozSetup(2, sampleRate); /* channels, sample rate */
		
		var buffer = null; /* data generated but not yet written */
		var writtenSampleCount = 0; /* NB this counts stereo samples as two */
		
		/* try to write what's in the buffer; if we can't clear it, try again in 20ms.
			Assumes that buffer != null (if it is null, why on earth are you calling this?)
		*/
		function writeFromBuffer() {
			var written = audioElement.mozWriteAudio(buffer);
			writtenSampleCount += written;
			if (written < tail.length) {
				buffer = buffer.slice(written);
				setTimeout(writeFromBuffer, 20);
			} else {
				buffer = null;
			}
		}
		
		return {
			'write': function(data) {
				if (buffer) {
					/* there's a backlog of stuff to write. Just append ours and return with an ETA */
					var dataPosition = writtenSampleCount + buffer.length;
					buffer = buffer.concat(data);
					return (dataPosition - audioElement.mozCurrentSampleOffset()) * 500 / sampleRate;
				}
				
				/* try to write our data */
				var dataPosition = writtenSampleCount;
				var written = audioElement.mozWriteAudio(data);
				writtenSampleCount += written;
				if (written < data.length) {
					/* couldn't write it all; stick the rest in buffer and try again later */
					buffer = data.slice(written);
					setTimeout(writeFromBuffer, 20);
				}
				return (dataPosition - audioElement.mozCurrentSampleOffset()) * 500 / sampleRate;
			},
			/* It appears that we can't actually implement stop(), because
			the audio element blissfully ignores pause() calls when using mozWriteAudio.
			Whoopee-doo. */
			'bufferedDuration': function() {
				if (buffer) {
					var dataPosition = writtenSampleCount + buffer.length;
				} else {
					var dataPosition = writtenSampleCount;
				}
				return (dataPosition - audioElement.mozCurrentSampleOffset()) * 500 / sampleRate;
			},
			'ready': function(callback) {
				/* we're always ready! */
				callback();
			}
		}
	} else {
		// Fall back to creating flash player
		var c = document.createElement('div');
		c.innerHTML = '<embed type="application/x-shockwave-flash" id="da-swf" src="da.swf" width="8" height="8" allowScriptAccess="always" style="position: fixed; left:-10px;" />';
		document.body.appendChild(c);
		var swf = document.getElementById('da-swf');
		
		return {
			'write': function(data) {
				var out = new Array(data.length);
				for (var i = data.length-1; i != 0; i--) {
					out[i] = Math.floor(data[i]*32768);
				}
				return swf.write(out.join(' '));
			},
			'stop': function() {
				swf.stop();
			},
			'bufferedDuration': function() {
				return swf.bufferedDuration();
			},
			'ready': function(callback) {
				function checkReady() {
					if (swf.write) {
						callback();
					} else {
						setTimeout(checkReady, 10);
					}
				}
				checkReady();
			}
		}
	}
}
