import numpy as np, wave
sr=44100; n=sr*30; rng=np.random.default_rng(1)
a=np.zeros(n)
def put(t,x):
    i=int(t*sr); x=x[:max(0,n-i)]; a[i:i+len(x)]+=x
def tt(d): return np.arange(int(d*sr))/sr
def lp(x,k):
    return np.convolve(x,np.ones(k)/k,mode='same')
def pop(t,g):
    d=tt(.6); env=np.exp(-d*14)
    thump=np.sin(2*np.pi*(50+200*np.exp(-d*30))*d)*env
    click=lp(rng.standard_normal(len(d)),3)*np.exp(-d*60)
    put(t,g*(thump*.9+click*.8))
def whoosh(t,dur,g):
    d=tt(dur); env=np.sin(np.pi*d/dur)**2
    x=rng.standard_normal(len(d)); x=lp(x,20)
    sweep=np.sin(2*np.pi*np.cumsum(200+1400*d/dur)/sr)*.2
    put(t,g*(x*3+sweep)*env)
def buzz(t,dur,g):
    d=tt(dur); env=np.minimum(1,np.minimum(d/.2,(dur-d)/.3))
    x=(2*((90*d)%1)-1)*(.6+.4*np.sin(2*np.pi*14*d))
    put(t,g*lp(x,6)*env)
def ding(t,g):
    d=tt(2.5); put(t,g*(np.sin(2*np.pi*1318*d)+.4*np.sin(2*np.pi*2637*d))*np.exp(-d*2.2))
pop(3.0,1.0); pop(22.5,1.3)
buzz(4.0,4.5,.35); whoosh(8.5,1.5,.5); whoosh(14.0,1.5,.45)
# rising tension tone beat 4-5
d=tt(8.0); put(14.5,.12*np.sin(2*np.pi*np.cumsum(180+500*(d/8)**2)/sr)*np.minimum(1,d/1))
ding(25.0,.5)
a=a/np.max(np.abs(a))*.9
w=wave.open('sfx.wav','wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
w.writeframes((a*32767).astype(np.int16).tobytes()); w.close()
