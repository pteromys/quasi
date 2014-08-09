varying mediump vec2 vTexCoord;
varying mediump vec3 vVID;

void main(void) {
	lowp float d = dot(vTexCoord, vTexCoord);
	if (d > 1.0) { discard; }
	gl_FragColor = vec4(vVID, 1.0);
}

