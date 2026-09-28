"use client";
import React, { useState } from "react";
import Link from "next/link";
import Head from "next/head";
import { GradientText } from "@/components/animate-ui/text/gradient";
import { AuroraText } from "@/components/magicui/aurora-text";

export default function LoginPage() {
  const [name, setName] = useState("");

  function handleChange(event) {
    setName(event.target.value);
  }

  return (
    <>
      <Head>
        <title>Welcome page</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <section className="min-vh-100 d-flex flex-column justify-content-center align-items-center text-center bg-dark text-white">
        <h1 className="display-1 fw-bold mb-3">Kamui</h1>
        <p className="lead mb-4">Multi session WhatsApp bot built for Enterprise-grade performance.</p>
        <a href="#username" className="btn btn-danger btn-lg rounded-0">Get Started</a>
      </section>

      <div className="d-flex align-items-center justify-content-center min-vh-100">
        <main className="form-signin w-100 text-center">
          

          <h1 className="mb-3" id="username">
            <AuroraText>Hello {name} <i className="bi bi-lightbulb"></i></AuroraText>
          </h1>

          <div className="form-floating mb-3 text-danger">
            <input
              type="text"
              className="form-control"
              id="floatingInput"
              placeholder="Username"
              autoComplete="off"
              onChange={handleChange}
              value={name}
            />
            <label htmlFor="floatingInput">Username</label>
          </div>

          <Link href="/page2" className="w-100">
            <button className="btn btn-outline-danger w-100 py-2" type="button">
              Sign in
            </button>
          </Link>

          <p className="h4 my-4">
            <GradientText text="Nyah" />
          </p>

          {/* <img src="/images/back1.jpg" className="img-fluid my-3" alt="Background" /> */}

        </main>
      </div>

    </>
  );
}
