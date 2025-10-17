export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[color:var(--color-primary)] to-white">

        <div className="absolute top-10  items-center justify-center text-white font-bold text-3xl">
            <h1>
                Welcome User!
            </h1>
        </div>

      <div className="bg-gradient-to- opacity-70  p-8 rounded-xl shadow-lg w-[400px]">

        {/* Logo dan Judul */}
        <div className="text-center mb-6">
            <div className="w-13 h-13 mx-auto mb-4 rounded-xl shadow-xl flex items-center justify-center">
                <img src="/logo/signin.svg" alt="" className="w-10 h-10"/>
            </div>
          <h1 className="text-2xl text-white font-bold">Sign in with email</h1>
          <p className="text-white text-sm mt-2">
            Make a new doc to bring your words, data, and teams together. For free
          </p>
        </div>

        {/* Form Login */}
        <form className="space-y-4 text-sm">
          <div>
            <input
              type="email"
              placeholder="Email"
              className="w-full p-2 px-3 bg-gray-100 rounded-xl focus:outline-none"
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Password"
              className="w-full p-2 px-3 bg-gray-100 rounded-xl focus:outline-none"
            />
          </div>
          <div className="text-right">
            <a href="#" className="text-sm text-gray-200">
              Forgot password?
            </a>
          </div>
          <button className="w-full bg-gradient-to-br from-[color:var(--color-primary)] to-black text-white font-semibold p-3 rounded-lg shadow-xl">
            Create an Account
          </button>
        </form>

        {/* Social Login */}
        <div className="mt-4">
          <p className="text-center text-sm text-gray-200 mb-4">
            Or sign in with
          </p>
          <div className="flex justify-center space-x-4">
            <button className="p-2 bg-white shadow-xl rounded-lg">
              <img src="/logo/google.svg" alt="Google" className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}