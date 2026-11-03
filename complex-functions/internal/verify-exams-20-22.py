"""Recheck the 2020--2022 exam content without network access.

Run: python output/cvf-review/internal/verify-exams-20-22.py
Requires the existing local mpmath and sympy packages. No file is modified.
Symbolic identities, high-precision integrals and source/schema completeness are
checked separately; a passing numeric check is not a proof of a missing hypothesis.
"""
from pathlib import Path
from collections import Counter
import json
import re
import mpmath as mp
import sympy as sp

ROOT = Path(__file__).resolve().parents[1]
items = json.loads((ROOT / 'content' / 'exams-20-22.json').read_text(encoding='utf-8'))
required = {'id','year','yearKey','chapter','number','title','sourceFile','page',
            'sourceNote','tags','difficulty','question','hint','solution','answer',
            'check','errata','related'}
expected = {f'E2020-{n:02d}' for n in range(1, 15)}
expected |= {f'E2022-{n:02d}' for n in range(1, 13)}
for major, count in [(1,3),(2,3),(3,2),(4,2),(5,2)]:
    expected |= {f'E2021-{major:02d}-{minor:02d}' for minor in range(1,count+1)}
expected.add('E2021-06')
assert len(items) == 39 and {e['id'] for e in items} == expected
assert Counter(e['yearKey'] for e in items) == {'2020':14,'2021':13,'2022':12}
for e in items:
    assert set(e) == required
    assert 1 <= e['chapter'] <= 7 and e['related'] == f"ch{e['chapter']:02d}"
    assert e['difficulty'] in [1,2,3]
    assert e['page'] == (2 if e['yearKey']=='2020' and int(e['number'])>=12 else 1)
    for field in ['question','hint','solution','answer','check']:
        text = e[field]
        assert text.strip() and not re.search(r'[\x00-\x08\x0b\x0c\x0e-\x1f]',text)
        assert text.count('$$') % 2 == 0, (e['id'],field,'display math')
        assert text.replace('$$','').count('$') % 2 == 0, (e['id'],field,'inline math')
print('PASS completeness/schema/TeX delimiters: 39 entries (14 + 13 + 12)')

mp.mp.dps = 60
def close(label, got, want, tol=mp.mpf('1e-45')):
    error = abs(got-want)
    assert error < tol, (label,mp.nstr(got,35),mp.nstr(want,35),mp.nstr(error,10))
    print('PASS', label, '| error', mp.nstr(error,4))

def contour(fun, center=0, radius=1):
    def integrand(t):
        phase = mp.exp(1j*t)
        return fun(center+radius*phase)*(1j*radius*phase)
    return mp.quad(integrand,[0,mp.pi/2,mp.pi,3*mp.pi/2,2*mp.pi])

z,w,s,t = sp.symbols('z w s t')
def identity(label, expression):
    assert sp.simplify(expression) == 0, (label,expression)
    print('PASS',label)

# Exact algebra and local expansions.
identity('2020 Q1 fourth-power reduction', (1+sp.I)**4+4)
identity('2020 Q2 tangent', sp.tan(3*sp.pi/8)-(1+sp.sqrt(2)))
identity('2020 Q4 straight path', sp.integrate(((1+sp.I)*t)**3*(1+sp.I)+t**3*(1+sp.I),(t,0,1))-(-3+sp.I)/4)
identity('2020 Q4 broken path', -1+sp.Rational(1,4)+sp.I-(-sp.Rational(3,4)+sp.I))
identity('2020 Q5 removable limit',sp.limit(z/(1-sp.exp(7*z)),z,0)+sp.Rational(1,7))
identity('2020 Q6 inner series sum',1/(z*(z-1)**2)-1/(z*(1-z)**2))
identity('2020 Q6 outer series sum',1/((w+1)*w**2)-w**-3/(1+1/w))
identity('2020 Q9 zero residue',sp.residue(sp.cos(sp.pi*z)/(z**2*sp.sin(sp.pi*z)),z,0)+sp.pi/3)
identity('2020 Q11 disk map derivative',sp.diff(4*(z-1)/(4-z),z)-12/(4-z)**2)
identity('2020 Q12 integral term',(-sp.diff(1/(s*s+1),s))/s-2/(s*s+1)**2)
identity('2020 Q13 image derivative',sp.diff(sp.log(1+1/s),s)+1/(s*(s+1)))
identity('2021 Q1(2) factorization',(z-2)*(z+1)**2-(z**3-3*z-2))
identity('2021 Q2(3) division',(1-z*z)/(5-4*z)-(z/4+sp.Rational(5,16)-sp.Rational(9,16)/(5-4*z)))
identity('2021 Q3(1) fourth derivative',sp.diff(z*z*sp.exp(z),z,4).subs(z,1)-21*sp.E)
identity('2021 Q3(2) summed Laurent series',2*(w-1)/(w*(2-w))**2-(-1/(2*w*w)+sp.Rational(1,8)/(1-w/2)**2))
mobius=(sp.sqrt(3)*z+1)/(sp.sqrt(3)-z)
identity('2021 Q4(2) fixed point',mobius.subs(z,sp.I)-sp.I)
identity('2021 Q4(2) derivative angle',sp.diff(mobius,z).subs(z,sp.I)-(sp.Rational(1,2)+sp.I*sp.sqrt(3)/2))
identity('2021 Q5(1) Laplace algebra',2/s-2*s/(s*s+1)-2*s/(s*s+1)**2-2/(s*(s*s+1)**2))
identity('2021 Q5(2) Laplace algebra',s/(s*s-1)-s/(s*s+1)-2*s/(s**4-1))
identity('2022 Q1 algebra',(1-sp.I)**5-(-4+4*sp.I))
identity('2022 Q3 summed Laurent series',1/(w*(w+sp.I)**2)+1/(w*(1-sp.I*w)**2))
# SymPy does not directly expand sin(1/z) at its essential singularity.
# After w=1/z, the required z^-1 coefficient is the w^3 coefficient of sin(w).
identity('2022 Q6 residue',sp.sin(w).series(w,0,5).removeO().coeff(w,3)+sp.Rational(1,6))
identity('2022 Q9 Laplace value',(-sp.diff(1/(s*s+1),s)).subs(s,2)-sp.Rational(4,25))
identity('2022 Q10 inverse transform algebra',(1/s-s/(s*s+4))/4-1/(s*(s*s+4)))

# Independent high-precision integrations, with no use of supplied reference answers.
close('2020 Q5 contour',contour(lambda q:q/(1-mp.exp(7*q))),0)
close('2020 Q7 contour',contour(lambda q:1/(q*q*mp.log(q+mp.e))),-2j*mp.pi/mp.e)
oscillatory=mp.quadosc(lambda x:x*mp.sin(x)/(x*x+1),[0,mp.inf],omega=1)
close('2020 Q8 oscillatory real integral',oscillatory,mp.pi/(2*mp.e))
close('2020 Q8 complete real integral',oscillatory+mp.quad(lambda x:1/(x*x+1),[0,1,mp.inf]),mp.pi/2*(1+1/mp.e))

a=[]
for n in range(90):
    if n%2==0:
        p=n//2
        a.append(mp.sin(1)*mp.fsum([(-1)**j/mp.factorial(2*j) for j in range(p+1)]))
    else:
        p=(n-1)//2
        a.append(-mp.cos(1)*mp.fsum([(-1)**j/mp.factorial(2*j+1) for j in range(p+1)]))
r0=mp.fsum([a[n]/mp.factorial(n+1) for n in range(len(a))])
rm1=mp.sin(2)/(2*mp.e)
fun=lambda q:mp.exp(1/q)*mp.sin(q-1)/(q*q-1)
close('2021 Q2(1) local essential-singularity residue',contour(fun,radius=mp.mpf('0.5'))/(2j*mp.pi),r0)
close('2021 Q2(1) full contour vs residue series',contour(fun,radius=2),2j*mp.pi*(r0+rm1))
close('2021 Q2(2) contour',contour(lambda q:1/mp.sin(q)+1/(q-2)**2,radius=3),2j*mp.pi)
close('2021 Q2(3) real integral',mp.quad(lambda x:mp.sin(x)**2/(5-4*mp.cos(x)),[0,mp.pi,2*mp.pi]),mp.pi/4)
close('2022 Q5 shifted circle radius 3/2',contour(lambda q:mp.exp(1j*q)/(q*q+1),center=2j,radius=mp.mpf('1.5')),mp.pi/mp.e)
close('2022 Q6 contour',contour(lambda q:q*q*mp.sin(1/q)),-1j*mp.pi/3)
close('2022 Q9 real integral',mp.quad(lambda q:q*mp.exp(-2*q)*mp.sin(q),[0,1,mp.inf]),mp.mpf(4)/25)
close('2022 Q11 real integral',mp.quad(lambda q:1/(mp.sqrt(2)+mp.cos(q))**2,[0,mp.pi]),mp.pi*mp.sqrt(2))
close('2022 Q12 real integral',mp.quad(lambda q:mp.exp(mp.cos(q))*mp.cos(mp.sin(q)),[0,mp.pi]),mp.pi)

# Check the scale and orientation of the maps on deterministic interior samples.
for x in [mp.mpf('-0.1'),mp.mpf('-1'),mp.mpf('-3')]:
    for y in [mp.pi/7,mp.pi/2,6*mp.pi/7]:
        assert mp.im(-mp.cosh(x+1j*y))>0
for q in [0,mp.mpf('0.25'),-mp.mpf('0.8'),mp.mpf('0.4')*1j]:
    ww=(2*q-1)/(2-q)
    close('2022 Q8 disk identity',1-abs(ww)**2,3*(1-abs(q)**2)/abs(2-q)**2)
print('PASS map interior sign and disk identities')
print('2021 Q2(1) residue at 0 =',mp.nstr(r0,50))
print('2021 Q2(1) integral =',mp.nstr(2j*mp.pi*(r0+rm1),50))
print('All checks passed. Numerical agreement does not replace the written proofs.')
