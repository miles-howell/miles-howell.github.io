---
layout: post
title: "Finding the Billionth Hamming Number by Counting Points Under a Plane"
date: 2026-10-29 00:00:00 -0500
categories: [Programming, Algorithms]
tags: [Hamming Numbers, Number Theory, Geometry, Python, Numerical Methods]
toc: true
math: true
---

Hamming numbers are a classic programming exercise. You solve it with Dijkstra's three-pointer trick, it passes the tests, and you move on. I didn't move on. I wanted the *billionth* one, and the textbook method can't get there.

This post walks through the approach I ended up with: take logarithms, turn the problem into counting lattice points inside a tetrahedron, and then use a little numerical root-finding to land on the answer. In pure Python it finds the billionth Hamming number (an 844-digit integer) in about 5 seconds, using about 8 KB of memory.

The code is on GitHub at [miles-howell/Logarithmic-Hamming-Numbers](https://github.com/miles-howell/Logarithmic-Hamming-Numbers), and there's an [interactive Desmos visualization](https://www.desmos.com/3d/d7d7piepsc) of the geometry.

## What a Hamming number is

A Hamming number (also called a *regular number* or *5-smooth number*) is a positive integer whose only prime factors are 2, 3 and 5:

$$H = 2^i \cdot 3^j \cdot 5^k, \qquad i, j, k \ge 0$$

The sequence starts 1, 2, 3, 4, 5, 6, 8, 9, 10, 12, 15, 16, 18, 20, 24, 25, … and the question is: given $n$, what is the $n$-th one?

## The standard approach and where it stops

The well-known solution, usually credited to Dijkstra, builds the sequence in order. Every Hamming number after 1 is 2, 3 or 5 times an earlier one, so you keep three pointers into the list you've built so far and repeatedly append the smallest of the three candidates:

```python
def dijkstra(n):
    h = [1] * n
    i2 = i3 = i5 = 0
    x2, x3, x5 = 2, 3, 5
    for idx in range(1, n):
        nxt = min(x2, x3, x5)
        h[idx] = nxt
        if nxt == x2: i2 += 1; x2 = 2 * h[i2]
        if nxt == x3: i3 += 1; x3 = 3 * h[i3]
        if nxt == x5: i5 += 1; x5 = 5 * h[i5]
    return h[-1]
```

It's elegant, and it's $O(n)$ in time. The catch is that it's also $O(n)$ in *memory*, and the stored values aren't small. They are big integers whose length grows with $n$. In my measurements, $n = 10^7$ takes 18 seconds and about 934 MB of Python heap. $n = 10^9$ would need well over 100 GB.

To get further, I needed a way to jump straight to the $n$-th value without building everything before it.

## Changing the question

The trick is to stop asking "what is the $n$-th Hamming number?" and instead ask a question that's easier to answer:

> **How many Hamming numbers are at most $X$?**

If I can answer that quickly for any $X$, I can search for the $X$ where the answer becomes exactly $n$.

### Taking logarithms

A Hamming number is at most $X$ when $2^i 3^j 5^k \le X$. Take the natural log of both sides and the product becomes a sum:

$$i \ln 2 + j \ln 3 + k \ln 5 \le B, \qquad B = \ln X$$

This is a linear inequality in three integer variables. Geometrically, the equation $i \ln 2 + j \ln 3 + k \ln 5 = B$ is a plane, and together with the three coordinate planes $i = 0$, $j = 0$, $k = 0$ it cuts out a tetrahedron in the first octant.

Every Hamming number corresponds to exactly one integer point $(i, j, k)$, because prime factorizations are unique. So:

> **The number of Hamming numbers $\le e^B$ is the number of integer lattice points inside that tetrahedron.**

As $B$ grows, the slanted face slides outward and swallows more points. The $n$-th Hamming number is the point the face swallows as the count reaches $n$. The [Desmos visualization](https://www.desmos.com/3d/d7d7piepsc) shows this well.

## Counting the points

Counting lattice points under a plane doesn't require visiting each one. Fix $k$ and $j$. Then the valid values of $i$ are $0, 1, \dots$ up to

$$i_{\max} = \left\lfloor \frac{B - j \ln 3 - k \ln 5}{\ln 2} \right\rfloor$$

so that column contains $i_{\max} + 1$ points, computed with one division. That leaves a double loop over $(j, k)$:

```python
import math

a, b, c = math.log(2), math.log(3), math.log(5)
inv_a = 1.0 / a

def count(B):
    if B < 0:
        return 0
    total = 0
    rem_k = B                    # B - k*ln5
    while rem_k >= 0:
        rem_j = rem_k            # B - j*ln3 - k*ln5
        while rem_j >= 0:
            total += int(rem_j * inv_a + 1e-11) + 1
            rem_j -= b
        rem_k -= c
    return total
```

Instead of computing `B - j*b - k*c` from scratch each time, the loops subtract running remainders. The `1e-11` nudge keeps a value like `1.99999999999` from flooring to 1 when the exact answer is 2.

### How expensive is one count?

The double loop visits every $(j, k)$ pair under the triangle $j \ln 3 + k \ln 5 \le B$. That triangle has area $B^2 / (2 \ln 3 \ln 5)$, so one call to `count` costs $O(B^2)$.

How big is $B$? The tetrahedron's volume is

$$V(B) = \frac{B^3}{6 \ln 2 \ln 3 \ln 5}$$

and for large $B$ the number of lattice points is close to that volume. Setting $V(B) \approx n$ gives $B \approx \sqrt[3]{6n \ln 2 \ln 3 \ln 5}$, which grows like $n^{1/3}$. So one count costs

$$O(B^2) = O(n^{2/3})$$

For $n = 10^9$ that's about a million inner-loop steps per count, compared with a billion steps for the sequential method.

## Finding the boundary

Now I need the $B$ where `count(B)` reaches $n$. Binary search would work, but each count is the expensive part, so I want as few of them as possible. Three stages get there.

### 1. A geometric first guess

The volume formula above already gives a guess. It can be improved with a correction that's common in lattice-point counting: the true count includes the points sitting on the three coordinate faces, which the bare volume undercounts. Shifting $B$ by half the sum of the logs accounts for that:

$$B_0 = \sqrt[3]{6n \ln 2 \ln 3 \ln 5} - \frac{\ln 2 + \ln 3 + \ln 5}{2}$$

This guess is very good. For $n = 10^6$, `count(B0)` returns 999,970. It's off by 30 out of a million before any real search starts.

### 2. One Newton step

The derivative of the volume tells us roughly how many new points appear per unit of $B$:

$$f'(B) = \frac{dV}{dB} = \frac{B^2}{2 \ln 2 \ln 3 \ln 5}$$

One Newton-Raphson step uses that slope to correct the miss:

$$B_1 = B_0 - \frac{C_0 - n}{f'(B_0)}$$

### 3. Secant iterations

After that I have two real measurements, $(B_0, C_0)$ and $(B_1, C_1)$, so I switch to the secant method. It uses the actual slope of the count between the last two guesses instead of the theoretical one:

$$m = \frac{C_1 - C_0}{B_1 - B_0}, \qquad B_{\text{next}} = B_1 - \frac{C_1 - n}{m}$$

Here's the real trace for $n = 10^6$:

| Step | $B$ | count($B$) | Miss |
| :--- | ---: | ---: | ---: |
| Volume estimate | 192.7600800023 | 999,970 | −30 |
| Newton step | 192.7620590725 | 1,000,002 | +2 |
| Secant step | 192.7619353806 | 1,000,000 | 0 |

Three counts and it hits the target. For $n = 10^9$ the misses go −287, +2, +2, −1, 0, so five counts.

## A step function doesn't have a root

Hitting a count of exactly $n$ doesn't finish the job. `count(B)` is a staircase: it stays flat between Hamming numbers and jumps by one at each of them. Any $B$ in the interval $[\ln H_n, \ln H_{n+1})$ gives a count of $n$, and the secant method lands somewhere in that interval, not exactly on $\ln H_n$. (In the trace above, the secant step landed at 192.76194, while $\ln H_{10^6}$ is 192.76190.)

So the last stage builds a narrow band around the answer:

1. Start with $lo = B - 10^{-8}$ and $hi = B + 10^{-8}$.
2. Widen until $\text{count}(lo) < n \le \text{count}(hi)$, so the $n$-th point is guaranteed to lie between the two planes.
3. Walk the same $(j, k)$ grid, but this time generate the actual integers for the $i$ values between the two planes. That's usually only a handful of numbers.
4. Sort them as exact integers and take the one at index $n - \text{count}(lo)$.

```python
p35 = (3**j) * (5**k)
for i in range(top_lo + 1, top_hi + 1):
    band.append(p35 << i)        # p35 * 2**i, via a bit shift
```

This is where floating point gives way to exact arithmetic. Logs are only used to decide *which* few candidates to look at. The final comparison is between real integers, so the answer is exact even though the search used floats.

## Benchmarks

All numbers come from [`benchmark.py`](https://github.com/miles-howell/Logarithmic-Hamming-Numbers/blob/main/benchmark.py) on Python 3.13 (CPython, single thread) on a 2.8 GHz Xeon cloud VM. Times are medians, and memory is peak Python heap measured with `tracemalloc`.

| $n$ | Digits | Logarithmic | Memory | Dijkstra | Dijkstra memory |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1,000 | 8 | 13.5 ms | 288 B | 0.28 ms | 38 KB |
| 10,000 | 18 | 3.7 ms | 304 B | 3.6 ms | 422 KB |
| 100,000 | 39 | 5.6 ms | 352 B | 42.6 ms | 5 MB |
| 1,000,000 | 84 | 21.1 ms | 428 B | 606 ms | 63 MB |
| 10,000,000 | 182 | 142 ms | 596 B | 18.4 s | 934 MB |
| 100,000,000 | 392 | 645 ms | 1 KB | — | — |
| 1,000,000,000 | 844 | 5.17 s | 8 KB | — | — |

The same script checks correctness. `hamming(n)` matches Dijkstra for every $n$ from 1 to 20,000, and it reproduces known values, including

$$H_{10^9} = 2^{1334} \cdot 3^{335} \cdot 5^{404}$$

What the table shows:

- **The crossover is around $n = 10^4$.** Below that, Dijkstra's simple loop wins. Above it, the gap grows quickly: at $10^7$ the logarithmic method is about 130× faster and uses about a million times less memory.
- **Scaling matches the theory.** From $10^6$ up, each 10× increase in $n$ costs 4.5× to 8× more time. The $n^{2/3}$ cost of a single count predicts $10^{2/3} \approx 4.6\times$. The rest comes from the number of count calls changing (7 at $10^8$, 9 at $10^9$).
- **Small $n$ is oddly slow.** $n = 1000$ is slower than $n = 10{,}000$. For small $n$, neighbouring Hamming numbers are far apart in log space, and the bracket-widening step moves in fixed $10^{-5}$ increments, so it needs hundreds of counts to reach the next point. That's an easy fix (widen geometrically, or by the expected gap $1/f'(B)$), and it only matters where Dijkstra is the better choice anyway.

## Limits and caveats

**Floating-point precision.** The search runs on 64-bit floats. At $n = 10^9$, $B \approx 1943$. A double's rounding step at that size is about $4 \times 10^{-13}$, and the *average* gap between neighbouring Hamming numbers in log space is $1/f'(B) \approx 6.5 \times 10^{-7}$. That's a comfortable margin on average, but averages hide close pairs. The running-subtraction loops also add a little error with each step. If a Hamming number sits within rounding error of the $lo$ or $hi$ plane, it could be misclassified. Pushing well past $10^{12}$ would call for more care: exact or interval arithmetic near the band edges, or higher-precision logs.

**It's not free at small sizes.** As the benchmarks show, for a few thousand terms the sequential method is simpler and faster.

**There's room left.** `count` is the only expensive part, and each $k$-slice of it is independent of the others, so it would parallelize cleanly across cores. The inner loop is also an obvious candidate for NumPy, Numba or C, which should be worth one to two orders of magnitude on its own.

## Takeaways

What I like about this problem is how much the change of perspective does. A question about integers and multiplication becomes, after one logarithm, a question about a plane sliding through a 3D grid. Once it's geometric, the rest follows: volume gives a near-perfect first guess, the derivative of that volume gives a Newton step, and the staircase shape of the count tells you why the final step has to go back to exact integers.

| | Dijkstra | Logarithmic |
| :--- | :--- | :--- |
| Time | $O(n)$ | $O(n^{2/3})$ per count, a handful of counts |
| Memory | $O(n)$ big integers | $O(1)$, plus a tiny band |
| Arithmetic | Exact integers | Floats to search, exact integers to finish |
| Best for | Small $n$, or the whole sequence | One very large $n$ |

If you want to try it, clone [the repository](https://github.com/miles-howell/Logarithmic-Hamming-Numbers) and run `python benchmark.py --quick`, or play with the tetrahedron in [Desmos](https://www.desmos.com/3d/d7d7piepsc). The [Codewars Hamming Numbers kata](https://www.codewars.com/kata/526d84b98f428f14a60008da) is a good place to try the small-$n$ version first.
