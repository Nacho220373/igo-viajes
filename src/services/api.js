// src/services/api.js

const API_URL = 'https://script.google.com/macros/s/AKfycbyfjs4oUx5ZsbDvcEZbeF2FFLFCTcQWtagH2qyRhq0TrTJ0NhHrirQ3vYMY6R1PZW8B_w/exec'; // <--- ¡AQUÍ PEGA TU URL!

/**
 * Función genérica para hablar con Google Apps Script
 * @param {Object} data - Los datos que queremos enviar (ej: {accion: 'login', ...})
 */
export const enviarPeticion = async (data) => {
  try {
    // Usamos 'no-cors' para evitar errores de desarrollo, pero el truco real
    // es enviar los datos como texto plano (text/plain) para que Google no se queje.
    const response = await fetch(API_URL, {
      method: 'POST',
      // Google Apps Script es quisquilloso con los headers. 
      // Enviarlo como text/plain evita el "pre-flight" OPTIONS request que suele fallar.
      headers: {
        'Content-Type': 'text/plain;charset=utf-8', 
      },
      body: JSON.stringify(data),
    });

    const resultado = await response.json();
    return resultado;

  } catch (error) {
    console.error("Error en la API:", error);
    return { exito: false, error: "Error de conexión" };
  }
};