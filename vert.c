attribute vec3 aVPosition;
attribute vec3 aVColor;
attribute vec2 aVTexCoord;
attribute vec3 aVID;

uniform mat4 uPMatrix;
uniform mat4 uMVMatrix;
uniform mediump vec3 uOrigin;
uniform mediump vec3 uOriginColor;
uniform mediump vec2 uScale;
uniform mediump vec2 uFog;
uniform mediump vec3 uDotSize;

varying mediump vec3 vColor;
varying mediump vec2 vTexCoord;
varying mediump float vFog;
varying mediump vec3 vVID;

mediump vec4 face(in mediump vec4 facing, in mediump vec2 corner) {
	facing = uMVMatrix * facing;
	vec3 right = normalize(cross(facing.xyz, vec3(0.0, 1.0, 0.0)));
	vec3 up = normalize(cross(right, facing.xyz));
	return facing + vec4(corner.x * right + corner.y * up, 0.0);
}

void main(void) {
	// Transform
	vColor = (aVColor + uOriginColor) * uScale.y;
	lowp float diameter = uDotSize.x * exp(dot(vColor, vColor) * uDotSize.y);
	gl_Position = uPMatrix * face(vec4((aVPosition + uOrigin) * uScale.x, 1.0), diameter * aVTexCoord - vec2(0.5 * diameter));
	// Set paint parameters
	vFog = clamp(uFog.x/gl_Position.w - uFog.y, 0.0, 1.0);
	vFog = 2.0 * vFog - vFog * vFog; // smoothly fade from full brightness
	vColor = vec3(1.0) / (vec3(1.0) + (vColor * vColor * uDotSize.z));
	vColor /= max(vColor.x, max(vColor.y, vColor.z));
	vTexCoord = 2.0 * aVTexCoord - vec2(1.0);
	vVID = aVID;
}
