
// Copyright 2016 T.Schwinger
// http://creativecommons.org/licenses/by-nc-sa/4.0/

// Whitted-style raytracer with analytic, single sample soft shadows,
// modern lighting and anti-aliased, procedural textures.

const int NoOfTraces = 3;

const vec3 LightPos = vec3( -.1, 2.5, 2.5 );
const float LightRadius = .16;
const float AmbientLight = 0.08;

const int NoOfSpheres = 7;
const float SpheresRadius = 0.75;
const float SphereRadius = 0.2;

const float SpheresRadStep = 6.282 / float( NoOfSpheres );

const float Far = 10.;
#define FAR 10.

float sqr( float x ) {
	return x * x;
}


struct Ray {
	vec3 o, d;
    float e;
    float de;
};

struct Surface {
	vec3 n;
	float c;
	vec3 a;
	float r;
};

Ray ray;
vec3 color;
vec3 importance;

struct Dots {
	float nl;
	float nh;
	float lh;
	float nv;
};

float specular( in float roughness, in Dots dots ) {

	float fresnel = 1. - exp2( -8.565 * dots.lh ) * 0.96;
	float alphaSqr = sqr( sqr( roughness ) );
	float dGGXsqrtDenom = sqr( dots.nh ) * (alphaSqr - 1. ) + 1.;
	float gGGXnv = dots.nv + sqrt( (dots.nv - dots.nv * alphaSqr) * dots.nv + alphaSqr );
	float gGGXnl = dots.nl + sqrt( (dots.nl - dots.nl * alphaSqr) * dots.nl + alphaSqr );
	return clamp( alphaSqr * fresnel / ( 3.14 * sqr( dGGXsqrtDenom ) * gGGXnv * gGGXnl ), 0., 1. );

}

float spec_reflect( float roughness, Dots dots ) {

	float fresnel = 1. - exp2( -8.565 * dots.lh ) * 0.96;
	float alphaSqr = sqr( sqr( roughness ) );
	float gGGXnv = dots.nv + sqrt( (dots.nv - dots.nv * alphaSqr) * dots.nv + alphaSqr );
	float gGGXnl = dots.nl + sqrt( (dots.nl - dots.nl * alphaSqr) * dots.nl + alphaSqr );
	return clamp( fresnel / ( 3.14 * max( .0001, gGGXnv * gGGXnl ) ), 0., 1. );

}


Dots dotsLighting( in vec3 n, in vec3 l ) {

	float nDotV = - min( dot( n, ray.d ), 0. );
	vec3 h = normalize( l - ray.d );
	return Dots(
		max( dot( n, l ), 0. ),
		dot( n, h ),
		dot( h, l ),
		nDotV
	);

}

Dots dotsReflect( in vec3 n, in float nDotV ) {

	return Dots( nDotV, 0., nDotV, nDotV );

}

void shade( in Surface s, in Dots dots, in float mask ) {

	mask *= dots.nl;
	color.rgb += importance * ( mask + AmbientLight ) * s.a;
	color.rgb += importance * ( mask * specular( s.r, dots ) );

}

void castSecondary( Surface s, float nDotV ) {

	float weight = nDotV * sqr( 1. - s.r );
	importance *= weight * s.a +
		weight * spec_reflect( s.r, dotsReflect( s.n, nDotV ) );
	ray.d = reflect( ray.d, s.n );
	ray.de *= s.c;

}

vec3 sphereCenter( float i ) {

    const vec2 RotYZ = vec2( 0.983843, -0.179029 );

    float t = iGlobalTime;
	float a = mod( i * SpheresRadStep + iGlobalTime * -0.5, 6.282 );
	vec3 p = vec3( sin( a ), 0., cos( a ) );
	p.xz *= SpheresRadius;
	p.yz *= mat2( RotYZ, -RotYZ.y, RotYZ.x );
	return p;

}

bool intersectsSphere( out Surface s ) {

    const float rr = SphereRadius * SphereRadius;
	s.c = 0.;
	float t_hit = FAR;
	float j_hit, r_hit;
	vec3  c_hit;
	for ( int i = 0; i != NoOfSpheres; ++ i ) {
		float r = SphereRadius;
        float j = float( i );
		vec3 c = sphereCenter( j );
        vec3 to = ray.o - c;
    	float p = dot(to, ray.d);
    	float d = sqr(p) - dot(to, to) + sqr(r);
		if ( d < 0.) continue;
		float t = -p - sqrt(d);
		if ( t > 0. && t < t_hit ) {
			t_hit = t;
			c_hit = c;
			r_hit = r;
            j_hit = j;
		}
	}

	if ( t_hit != FAR ) {
		ray.o += ray.d * t_hit;
		ray.e += ray.de * t_hit;
		s.n = normalize( ray.o - c_hit );
		s.c = 40.;
		s.a = 0.96 * clamp( abs(mod( iGlobalTime * 0.1 + j_hit * 0.954929658551372 +
				vec3(0., 4., 2. ), 6. ) - 3. ) - 1.0, 0.0, 0.8 );
		s.r = 0.13;
		return true;
	}

	return false;
}

float spheresShadow( out vec3 lightDir ) {

	vec3 pos = ray.o;
	vec3 dir = LightPos - ray.o;
	float norm = inversesqrt( dot( dir, dir ) );
	dir *= norm;
	lightDir = dir;
	float t_max = 1. / norm;
	float tau = 1.;
    float dDotO = dot( dir, pos );
	for ( int i = 0; i != NoOfSpheres; ++ i ) {
		vec3 c = sphereCenter( float(i) );
		float t = dot( dir, c ) - dDotO;
		if ( t > SphereRadius && t < t_max ) {
			float d = distance( c, pos + t * dir ) - SphereRadius;
			tau *= min( t_max * d / ( t * LightRadius ), 1. );
			if ( tau <= 0. ) break;
		}
	}

	return smoothstep( 0., 1., tau );

}


float stripe( in float t, in float pix, in float scale ) {

	float m = fract( t * scale - .25 ) - .5;
	float s = sign( m );
	float a = m * s;

	return s * smoothstep( 0., pix * scale, min( a, abs( a - .5 ) ) ) * .5 + .5;

}

bool intersectsEnvcube( out Surface s, in vec2 aspect ) {

	vec3 rcp_d = 1. / ray.d;

	vec3 dim = vec3( aspect * 1.5, 3.0 );

	vec3 t_min = -dim * rcp_d - ray.o * rcp_d;
	vec3 t_max = +dim * rcp_d - ray.o * rcp_d;
	t_min = mix( vec3( FAR ), t_min, sign( t_min - 0.001 ) * .5 + .5 );
	t_max = mix( vec3( FAR ), t_max, sign( t_max - 0.001 ) * .5 + .5 );
	t_min = min( t_min, t_max );
	float t = min( t_min.x, min( t_min.y, t_min.z ) );

	if ( t >= 0. && t < FAR ) {
		ray.o += ray.d * t;
		ray.e += ray.de * t;
		if ( t == t_min.z )
			s.n = vec3( 0., 0., t == t_max.z ? -1. : 1. );
		else if ( t == t_min.y )
			s.n = vec3( 0., t == t_max.y ? -1. : 1., 0. );
		else if ( t == t_min.x )
			s.n = vec3( t == t_max.x ? -1. : 1., 0., 0. );
		float pix = ray.e;
		vec3 absNorm = abs( s.n );
		float orthoU = dot( ray.o.yzx, absNorm );
		float orthoV = dot( ray.o.zxy, absNorm );
		float tex = stripe( orthoU, pix, 10. / 8. );
		float tex2 = stripe( orthoV, pix, 10. / 8. );
		s.a = vec3( mix( tex, 1. - tex, tex2 ) * .2 );
		s.c = 1.; ;
		s.r = .01;
		return true;
	}

	return false;
}

vec4 render( in vec2 aspect ) {

	color = vec3( 0. );
	importance = vec3( 1. );

	for ( int j = 0; j != NoOfTraces; ++ j ) {

		Surface s;
		if ( ! intersectsSphere( s ) &&
			! intersectsEnvcube( s, aspect ) ) break;

		ray.o += s.n * 0.001;

		vec3 l; float m = spheresShadow( l );
		Dots d = dotsLighting( s.n, l );
		shade( s, d, m );

		if ( j != NoOfTraces ) castSecondary( s, d.nv );

	}

	return vec4( sqrt(color), 1. );
}


Ray primary( in vec2 pos, in float epsX, in float fovX ) {

    float tanHalfFov = tan( radians( fovX * .5 ) );
    vec3 d = vec3( pos, -1. / tanHalfFov );
    return Ray( vec3( 0. ), normalize( d ), 0., epsX * 2. * tanHalfFov );
}

// #define SBS_STEREO

const float FovX = 85.;
#ifdef SBS_STEREO
const float EyeDisplace = 0.02;
const float Convergence = 1.6;
#endif

void mainImage( out vec4 fragColor, in vec2 fragCoord ) {

    vec2 rcpRes = 1. / iResolution.xy;
    vec2 aspect = min( iResolution.xy * rcpRes.yx, 1. );
    vec2 pos = fragCoord * rcpRes * 2. - 1.;

#ifdef SBS_STEREO
    float tanHalfFov = tan( radians( FovX * .5 ) );
    float eyeOffs = EyeDisplace * sign( pos.x ) * tanHalfFov;

    pos.x = fract( pos.x ) - .5;
    pos *= vec2( aspect.x * 2., aspect.y );

    float extraDistance = EyeDisplace / tanHalfFov;
    float fullDistance = Convergence + extraDistance;
    float halfWidth = Convergence * tanHalfFov;
    float scale = halfWidth / aspect.x;
    ray.d = normalize( vec3(
        vec2( pos.x - eyeOffs, pos.y ) * scale, -fullDistance ) );

    ray.o = vec3( eyeOffs, 0., extraDistance );
    ray.e = 0.;
    ray.de = 2. * rcpRes.x * tanHalfFov;
#else
	ray = primary( pos * aspect, rcpRes.x, FovX );
#endif

    ray.o.z += 1.8;
	fragColor = render( aspect );
}

void mainVR( out vec4 fragColor,
		in vec2 fragCoord, in vec3 fragRayOri, in vec3 fragRayDir ) {

    vec2 rcpRes = 1. / iResolution.xy;
    vec2 aspect = min( iResolution.xy * rcpRes.yx, 1. );

	ray = Ray( fragRayOri, fragRayDir, 0., length(rcpRes) );
	ray.o.z += 1.8;

    fragColor = render( aspect );
}


