import { TypingText } from "./animate-ui/text/typing";

export default function Footer() {
  return (
    <footer className="bg-black">
      <p className="text-center text-white">&copy; <TypingText text="Kamui" cursor={true} loop={true}/> </p>
    </footer>
  );
}
