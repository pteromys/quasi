varying lowp vec4 vColor;
const lowp vec2 cMid = vec2(0.5);

void main(void) {
	lowp vec2 xy = gl_PointCoord - cMid;
	lowp float d = 5.0 * dot(xy, xy);
	lowp float w = clamp(1.0 - 4.0 * d, 0.0, 1.0);
	gl_FragColor = clamp(vec4(clamp(vec3(1.0) - abs(2.0 * vColor.xyz), 0.0, 1.0) + vec3(w), 1.25 - d), 0.0, 1.0);
}

