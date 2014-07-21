varying lowp vec3 vColor;
varying mediump vec2 vTexCoord;
varying mediump float vFog;

void main(void) {
	lowp float d = dot(vTexCoord, vTexCoord);
	lowp float w = clamp(1.0 - 9.0 * d, 0.0, 1.0);
	gl_FragColor = clamp(vec4(vColor + vec3(w), (1.0 - d)*1.125 * vFog), 0.0, 1.0);
}

