# Replace this with the path to the mxmlc executable in the Flex SDK.
MXMLC = '/Developer/SDKs/flex_sdk_4.0.0.14159/bin/mxmlc'

task :default => "da.swf"

desc "build the dynamicaudio SWF"
file "da.swf" => "dynamicaudio.as" do
	sh %[ #{MXMLC} -use-network=false -o da.swf -file-specs "dynamicaudio.as" ]
end
