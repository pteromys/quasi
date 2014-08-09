varying mediump vec2 vTexCoord;

void main(void) {
	lowp float d = dot(vTexCoord, vTexCoord);
	gl_FragColor = vec4(0.0);
	if (d < 1.0 && d > 0.5) {
		gl_FragColor = vec4(1.0, 1.0, 1.0, 0.5);
	}
}

