"""Independent, read-only audit of the 29 recent/selected-old exam items.

Source images inspected: 25-26秋期末-1/2.png, 24-25-1/2/3/4.png,
old-49.png and old-51.png. Run from any working directory with Python and the
existing local mpmath/sympy packages. This script never writes content files.
The source-semantic check at the end distinguishes the actual printed z=1 in
2025 Q8 from its likely intended z=-1; algebraic agreement alone cannot do that.
"""
from pathlib import Path
from collections import Counter
import json
import re
import sys
import mpmath as mp
import sympy as sp

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
ROOT = Path(__file__).resolve().parents[1]
items = json.loads((ROOT/'content'/'exams-recent.json').read_text(encoding='utf-8'))
by_id = {e['id']:e for e in items}
expected = {f'E2025-{n:02d}' for n in range(1,15)}
expected |= {f'E2024-{n:02d}' for n in range(1,13)}
expected |= {'E2011-32','E2011-52','E2011-06'}
assert len(items)==29 and set(by_id)==expected
assert Counter(str(e['yearKey']) for e in items)=={'2025':14,'2024':12,'2011':3}
for e in items:
    for field in ['question','hint','solution','answer','check']:
        assert isinstance(e[field],str) and e[field].strip()
        assert not re.search(r'[\x00-\x08\x0b\x0c\x0e-\x1f]',e[field])
print('PASS 29 source items and nonempty solution fields: 14 + 12 + 3')

mp.mp.dps = 60
z,s,t,x,y = sp.symbols('z s t x y')
checks = 0
def identity(name, expr):
    global checks
    assert sp.simplify(expr)==0, (name,expr)
    checks += 1
    print('PASS',name)
def close(name, got, want, tolerance=mp.mpf('1e-45')):
    global checks
    err=abs(got-want)
    assert err<tolerance, (name,mp.nstr(got,30),mp.nstr(want,30),mp.nstr(err,8))
    checks += 1
    print('PASS',name,'| error',mp.nstr(err,5))
def contour(f,center=0,radius=1,orientation=1):
    def integrand(theta):
        u=mp.exp(orientation*1j*theta)
        return f(center+radius*u)*(orientation*1j*radius*u)
    return mp.quad(integrand,[0,mp.pi/2,mp.pi,3*mp.pi/2,2*mp.pi])

# 2025 Q1/Q2/Q3: direct complex evaluation and exact CR algebra.
for xx,yy in [(mp.mpf('.4'),mp.mpf('.7')),(mp.mpf('-.8'),mp.mpf('.2'))]:
    formula=(mp.sin(2*xx)+1j*mp.sinh(2*yy))/(mp.cos(2*xx)+mp.cosh(2*yy))
    close('2025 Q1 complex tangent formula',formula,mp.tan(xx+1j*yy))
u=3*x*y*y-x**3
v=y**3-3*x*x*y
identity('2025 Q2 CR first equation',sp.diff(u,x)-sp.diff(v,y))
identity('2025 Q2 CR second equation',sp.diff(u,y)+sp.diff(v,x))
identity('2025 Q2 -z^3 representation',sp.expand(u+sp.I*v+(x+sp.I*y)**3))
for radius in [mp.mpf('.2'),mp.mpf('.8'),mp.mpf('.999')]:
    for k in range(1,24):
        q=radius*mp.exp(2j*mp.pi*k/24)
        assert abs(mp.arg(q*q-3*q+2))<2*mp.pi/3
print('PASS 2025 Q3 principal-argument sample checks (proof still required)')

# 2025 Q4: integrate the original conjugate expression on both segments.
def line_integral(a,b):
    return mp.quad(lambda tt:(1+mp.conj(a+(b-a)*tt))/(a+(b-a)*tt)**2*(b-a),[0,1])
i1=line_integral(-1,1j)
i2=line_integral(1j,1)
close('2025 Q4 first segment',i1,1+1j-mp.pi/2)
close('2025 Q4 second segment',i2,-3-1j+mp.pi/2)
close('2025 Q4 original conjugate integral',i1+i2,-2)
close('2025 Q5 removable value',mp.limit(lambda q:(1-mp.exp(q))/((q-mp.pi*1j/2)*mp.sin(q)),0),-2j/mp.pi)
close('2025 Q5 full contour',contour(lambda q:(1-mp.exp(q))/((q-mp.pi*1j/2)*mp.sin(q)),radius=2),2*mp.pi*(1-1j)/mp.sinh(mp.pi/2))
close('2025 Q6 full contour',contour(lambda q:mp.cos(q)/(q*q*mp.sin(q)),radius=4),2j*mp.pi*(2/mp.pi**2-mp.mpf(1)/3))
q7=(mp.pi/2-mp.quadosc(lambda xx:mp.cos(2*xx)/(1+xx*xx),[0,mp.inf],omega=2))/2
close('2025 Q7 real integral',q7,mp.pi/4*(1-mp.exp(-2)))

# Actual source Q8 asks for residue at +1, which is an ordinary analytic point.
f8=lambda q:mp.sin(q/(q+1))
close('2025 Q8 residue at printed +1',contour(f8,center=1,radius=mp.mpf('.3'))/(2j*mp.pi),0)
close('2025 Q8 residue at singular -1',contour(f8,center=-1,radius=mp.mpf('.5'))/(2j*mp.pi),-mp.cos(1))
identity('2025 Q9 Taylor first coefficient',sp.diff(sp.log(2+z-z*z),z).subs(z,0)-sp.Rational(1,2))
identity('2025 Q9 Taylor second coefficient',sp.diff(sp.log(2+z-z*z),z,2).subs(z,0)/2+sp.Rational(5,8))

# Lens map: check all analytic stages AND inverse branches on interior samples.
def lens_forward(q):
    T=(q-1)/(q-1j)
    V=mp.exp(-3j*mp.pi/4)*T
    H=V**4
    return T,V,H,(H-1j)/(H+1j)
def lens_inverse(ww):
    H=1j*(1+ww)/(1-ww)
    V=mp.exp(mp.log(H)/4) # Im H>0 -> 0<arg V<pi/4, the unique sector root.
    T=mp.exp(3j*mp.pi/4)*V
    return (1j*T-1)/(T-1)
for q in [mp.mpf('.6')*(1+1j),mp.mpf('.8')+mp.mpf('.3')*1j,mp.mpf('.3')+mp.mpf('.8')*1j]:
    T,V,H,ww=lens_forward(q)
    assert 3*mp.pi/4<mp.arg(T)<mp.pi
    assert 0<mp.arg(V)<mp.pi/4 and mp.im(H)>0 and abs(ww)<1
    close('2025 Q10 inverse at lens point',lens_inverse(ww),q)
for ww in [0,mp.mpf('.7'),-mp.mpf('.4')*1j,mp.mpf('.6')+mp.mpf('.2')*1j]:
    q=lens_inverse(ww)
    assert mp.re(q)+mp.im(q)>1 and abs(q)<1
    close('2025 Q10 surjectivity via explicit inverse',lens_forward(q)[3],ww)
print('PASS 2025 Q10 sector width pi/4, correct branch, and inverse checks')
w11=(1-sp.I)/sp.sqrt(2)*(z-1)/(z-sp.I)
identity('2025 Q11 normalized derivative',sp.diff(w11,z).subs(z,1)-1/sp.sqrt(2))
identity('2025 Q12 time-shift algebra',sp.integrate(t*sp.exp(-s*t),(t,1,sp.oo),conds='none')-sp.exp(-s)*(1/s**2+1/s))
identity('2025 Q13 partial fractions',(2*s*s+4*s+1)/(s*(s+1)**2)-(1/s+1/(s+1)+1/(s+1)**2))

# 2024: exact roots, Taylor coefficients, three Laurent annuli, and integrals.
identity('2024 Q1 first root',(z*z-5*(1+sp.I)*z+13*sp.I).subs(z,3+2*sp.I))
identity('2024 Q1 second root',(z*z-5*(1+sp.I)*z+13*sp.I).subs(z,2+3*sp.I))
identity('2024 Q2 real part',(x**3+x*y*y+x)/(x*x+y*y)-(x+x/(x*x+y*y)))
f3=2*z/(1+z*z)**2
for n in range(11):
    an=(-1)**n*(n+1)*sp.sin((n+2)*sp.pi/4)/sp.sqrt(2)**(n+2)
    identity(f'2024 Q3 Taylor coefficient n={n}',sp.diff(f3,z,n).subs(z,1)/sp.factorial(n)-an)
identity('2024 Q3 a5=3/8',sp.diff(f3,z,5).subs(z,1)/sp.factorial(5)-sp.Rational(3,8))
for q in [mp.mpf('.2'),mp.mpf('1.2'),mp.mpf('4')]:
    target=3*q/((2*q-1)*(2-q))
    if abs(q)<mp.mpf('.5'):
        sm=mp.fsum([(mp.mpf(2)**(-n)-mp.mpf(2)**n)*q**n for n in range(350)])
    elif abs(q)<2:
        sm=mp.fsum([mp.mpf(2)**(-n-1)*q**(-n-1)+mp.mpf(2)**(-n)*q**n for n in range(350)])
    else:
        sm=mp.fsum([(mp.mpf(2)**(-n-1)-mp.mpf(2)**(n+1))*q**(-n-1) for n in range(350)])
    close('2024 Q4 Laurent sum in annulus',sm,target)
for n in [1,2,4,7]:
    integral=mp.quad(lambda th:mp.exp(mp.cos(th))*mp.cos(n*th-mp.sin(th)),[0,mp.pi,2*mp.pi])
    close(f'2024 Q5 coefficient n={n}',integral,2*mp.pi/mp.factorial(n))
f6=lambda q:(1-3*q)/((1-q)**2*(1+q))
close('2024 Q6 figure-eight integral',contour(f6,center=1,radius=1,orientation=-1)+contour(f6,center=-1,radius=1),4j*mp.pi)
f7=lambda xx:xx*mp.cos(2*xx)/(xx*xx-4*xx+5)
direct=mp.quadosc(f7,[-mp.inf,0],omega=2)+mp.quadosc(f7,[0,mp.inf],omega=2)
close('2024 Q7 two-sided oscillatory integral',direct,mp.pi*mp.exp(-2)*(2*mp.cos(4)-mp.sin(4)))
for q in [1j,1+2j,-3+mp.mpf('.1')*1j]:
    assert mp.im(-1/q)>0
for q in [3,2+2j,mp.mpf('.1')+2j]:
    V=1-2/q
    assert 0<mp.re(V)<1
    H=mp.exp(1j*mp.pi*V)
    assert mp.im(H)>0 and abs((H-1j)/(H+1j))<1
print('PASS 2024 Q8/Q9 map orientation and interior sample checks')

# 2024 logarithm inverse and 2011 logarithm-ratio inverse: direct Laplace integrals.
g24=lambda tt:2*(1-mp.cos(tt))/tt if tt else mp.mpf(0)
g11=lambda tt:2*mp.expm1(tt)*mp.cos(tt)/tt if tt else mp.mpf(2)
for ss in [mp.mpf('1.5'),mp.mpf('2.7'),mp.mpf('4')]:
    close('2024 Q11 unshifted logarithm',mp.quad(lambda tt:mp.exp(-ss*tt)*g24(tt),[0,1,mp.inf]),mp.log(1+1/ss**2))
    close('2024 Q11 delayed logarithm',mp.quad(lambda uu:mp.exp(-ss*(uu+1))*g24(uu),[0,1,mp.inf]),mp.exp(-ss)*mp.log(1+1/ss**2))
    G=mp.log((ss**2+1)/(ss**2-2*ss+2))
    close('2011 Q5(2) unshifted log ratio',mp.quad(lambda tt:mp.exp(-ss*tt)*g11(tt),[0,1,mp.inf]),G)
    close('2011 Q5(2) delayed log ratio',mp.quad(lambda uu:mp.exp(-ss*(uu+1))*g11(uu),[0,1,mp.inf]),mp.exp(-ss)*G)
for n in range(15):
    want=0 if n%2 else sp.factorial(n)/sp.factorial(n//2)
    identity(f'2011 Q3(2) derivative n={n}',sp.diff(sp.exp(z*z),z,n).subs(z,0)-want)

# These proof-only items have been manually checked against the rendered source.
print('MANUAL PROOF REVIEW: 2025 Q14 Liouville proof is valid;')
print('  principal log exists because f avoids the closed nonpositive real ray.')
print('MANUAL PROOF REVIEW: 2024 Q12 both Liouville and Cauchy-estimate proofs are valid.')
print('MANUAL PROOF REVIEW: 2011 Q6 pole at infinity -> polynomial proof is valid;')
print('  the limit is required for every complex approach to infinity, not just a ray.')

# Source wording audit. Do not silently replace a printed point by an intended one.
e8=by_id['E2025-08']
has_printed_point=bool(re.search(r'z\s*=\s*1',e8['question']))
has_source_erratum=bool(e8.get('errata')) and ('1' in e8['errata'])
print('Finished',checks,'independent symbolic/numeric checks.')
if not (has_printed_point and has_source_erratum):
    print('SOURCE MISMATCH: 2025 Q8 original p1 prints residue at z=1 (answer 0).')
    print('  Current question/errata must retain that point and separately explain')
    print('  the likely intended z=-1 (residue -cos(1)). Content file was NOT modified.')
    raise SystemExit(1)
print('PASS 2025 Q8 source wording retained and possible misprint disclosed.')
print('All checks passed. Sample checks support, but do not replace, the written proofs.')
