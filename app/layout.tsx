import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";

// Polices dans l'esprit de doe.co.nz (11/2026) :
// - texte : General Sans, gratuite, servie par Fontshare ;
// - titres : Archivo Black resserrée, gratuite. Doe utilise PP Right Grotesk Compact Black,
//   payante ; Jonathan a choisi de garder Archivo.
const archivo = Archivo({ variable: "--f-archivo", subsets: ["latin"], axes: ["wdth"] });

export const metadata: Metadata = {
  title: "The Latte Society, lattés glacés livrés à Cotonou et Calavi",
  description:
    "Lattés glacés signature, ou le vôtre à composer, préparés à la commande par Esther et livrés à Cotonou et Abomey-Calavi, du lundi au samedi.",
};

export const viewport: Viewport = { themeColor: "#4D2F2F" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={archivo.variable}>
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link rel="preconnect" href="https://cdn.fontshare.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600,700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
