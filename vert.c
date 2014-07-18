attribute vec4 aVPosition;
attribute vec4 aVColor;

uniform mat4 uPMatrix;
uniform mediump vec3 uOrigin;
uniform mediump vec3 uOriginColor;
uniform mediump vec2 uScale;
uniform mediump vec2 uFog;

varying mediump vec3 vColor;
varying mediump float vFog;

void main(void) {
	// Transform
	gl_Position = uPMatrix * vec4((aVPosition.xyz + uOrigin) * uScale.x, 1.0);
	vColor = (aVColor.xyz + uOriginColor) * uScale.y;
	// Set paint parameters
	gl_PointSize = 80.0 * exp(-0.25 * dot(vColor, vColor) / 0.4) / gl_Position.w;
	vFog = clamp(uFog.x/gl_Position.w - uFog.y, 0.0, 1.0);
	vColor = clamp(vec3(1.0) - abs(1.2 * vColor), 0.0, 1.0);
	vColor /= max(vColor.x, max(vColor.y, vColor.z));
}
