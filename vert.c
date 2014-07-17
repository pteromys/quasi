attribute vec4 aVPosition;
attribute vec4 aVColor;

uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
uniform mediump vec2 uScale;

varying mediump vec4 vColor;

void main(void) {
	gl_Position = uPMatrix * uMVMatrix * vec4(aVPosition.xyz * uScale.x, 1.0);
	vColor = aVColor * uScale.y;
	gl_PointSize = 200.0 * exp(-0.25 * dot(vColor.xyz, vColor.xyz) / 0.25) / gl_Position.w;
}
