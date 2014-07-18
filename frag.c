varying lowp vec3 vColor;
varying mediump float vFog;
const lowp vec2 cMid = vec2(0.5);

void main(void) {
	lowp vec2 xy = gl_PointCoord - cMid;
	lowp float d = 4.0 * dot(xy, xy);
	lowp float w = clamp(1.0 - 9.0 * d, 0.0, 1.0);
	gl_FragColor = clamp(vec4(vColor + vec3(w), (1.0 - d)*1.125 * vFog), 0.0, 1.0);
}

