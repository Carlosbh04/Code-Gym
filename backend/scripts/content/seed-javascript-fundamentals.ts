import { createPrismaClient } from '../../src/database/prisma.js';
import { loadConfig } from '../../src/config/load-config.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const prisma = createPrismaClient(config.database);

  try {
    await prisma.$connect();

    await prisma.technology.upsert({
      where: {
        id: 'javascript',
      },
      create: {
        id: 'javascript',
        name: 'JavaScript',
        icon: 'js',
        description:
          'El lenguaje de la web. Entrena lectura de código, predicción de resultados y corrección de errores sobre JavaScript moderno.',
        position: 0,
        isPublished: true,
      },
      update: {
        name: 'JavaScript',
        icon: 'js',
        description:
          'El lenguaje de la web. Entrena lectura de código, predicción de resultados y corrección de errores sobre JavaScript moderno.',
        isPublished: true,
      },
    });

    await prisma.topic.upsert({
      where: {
        id: 'js-fundamentals',
      },
      create: {
        id: 'js-fundamentals',
        technologyId: 'javascript',
        name: 'Fundamentos',
        description:
          'Conceptos esenciales de JavaScript antes de avanzar a estructuras, funciones y programación asíncrona.',
        position: 0,
        isPublished: true,
      },
      update: {
        technologyId: 'javascript',
        name: 'Fundamentos',
        description:
          'Conceptos esenciales de JavaScript antes de avanzar a estructuras, funciones y programación asíncrona.',
        position: 0,
        isPublished: true,
      },
    });

    await prisma.concept.upsert({
      where: {
        id: 'js-variables-basics',
      },
      create: {
        id: 'js-variables-basics',
        topicId: 'js-fundamentals',
        technologyId: 'javascript',
        name: 'Variables: let y const',
        position: 0,
        isPublished: true,
      },
      update: {
        topicId: 'js-fundamentals',
        technologyId: 'javascript',
        name: 'Variables: let y const',
        position: 0,
        isPublished: true,
      },
    });

    await prisma.learningSection.deleteMany({
      where: {
        conceptId: 'js-variables-basics',
      },
    });

    await prisma.learningSection.createMany({
      data: [
        {
          conceptId: 'js-variables-basics',
          type: 'INTRO',
          title: 'Introducción',
          content: {
            body:
              'Una variable permite guardar un valor para poder utilizarlo después en el programa.',
          },
          position: 0,
        },
        {
          conceptId: 'js-variables-basics',
          type: 'OBJECTIVES',
          title: 'Qué vas a aprender',
          content: {
            items: [
              'Entender qué es una variable',
              'Declarar valores con let y const',
              'Saber cuándo un valor puede cambiar',
            ],
          },
          position: 1,
        },
        {
          conceptId: 'js-variables-basics',
          type: 'EXPLANATION',
          title: '¿Qué es una variable?',
          content: {
            body:
              'Una variable es un nombre asociado a un valor. Ese nombre permite leer o reutilizar el valor sin repetirlo directamente.',
          },
          position: 2,
        },
        {
          conceptId: 'js-variables-basics',
          type: 'EXPLANATION',
          title: 'const',
          content: {
            body:
              'const se utiliza cuando la variable no debe recibir otra asignación después de declararse.',
          },
          position: 3,
        },
        {
          conceptId: 'js-variables-basics',
          type: 'CODE',
          title: 'Ejemplo con const',
          content: {
            language: 'javascript',
            code: 'const nombre = "Carlos";',
            caption: 'nombre mantiene la misma asignación.',
          },
          position: 4,
        },
        {
          conceptId: 'js-variables-basics',
          type: 'EXPLANATION',
          title: 'let',
          content: {
            body:
              'let se utiliza cuando el valor de la variable necesita cambiar durante la ejecución del programa.',
          },
          position: 5,
        },
        {
          conceptId: 'js-variables-basics',
          type: 'CODE',
          title: 'Ejemplo con let',
          content: {
            language: 'javascript',
            code: 'let edad = 25;\nedad = 26;',
            caption: 'edad puede recibir una nueva asignación.',
          },
          position: 6,
        },
        {
          conceptId: 'js-variables-basics',
          type: 'KEY_POINT',
          title: 'Punto clave',
          content: {
            body:
              'Usa const por defecto y cambia a let solamente cuando realmente necesites reasignar la variable.',
          },
          position: 7,
        },
        {
          conceptId: 'js-variables-basics',
          type: 'QUICK_CHECK',
          title: 'Comprobación rápida',
          content: {
            question:
              'Si un valor no necesita cambiar, ¿qué declaración deberías preferir?',
            answer: 'const',
          },
          position: 8,
        },
      ],
    });

    await prisma.exerciseSession.upsert({
      where: {
        id: 'js-variables-basics-01',
      },
      create: {
        id: 'js-variables-basics-01',
        conceptId: 'js-variables-basics',
        technologyId: 'javascript',
        title: 'Variables: let y const',
        difficulty: 'BEGINNER',
        version: '1.0.0',
        status: 'PUBLISHED',
        position: 0,
      },
      update: {
        conceptId: 'js-variables-basics',
        technologyId: 'javascript',
        title: 'Variables: let y const',
        difficulty: 'BEGINNER',
        version: '1.0.0',
        status: 'PUBLISHED',
        position: 0,
      },
    });

    await prisma.exerciseStep.deleteMany({
      where: {
        sessionId: 'js-variables-basics-01',
      },
    });

    await prisma.exerciseStep.createMany({
      data: [
        {
          id: 'step-1',
          sessionId: 'js-variables-basics-01',
          type: 'CODE_READING',
          prompt: '¿Qué valor tiene nombre después de ejecutar este código?',
          code: 'const nombre = "Carlos";',
          language: 'javascript',
          options: [
            {
              id: 'option-a',
              text: 'Carlos',
              correct: true,
            },
            {
              id: 'option-b',
              text: 'nombre',
              correct: false,
            },
            {
              id: 'option-c',
              text: 'undefined',
              correct: false,
            },
          ],
          explanation:
            'La variable nombre guarda la cadena "Carlos".',
          hints: [
            'Observa el valor que aparece a la derecha del signo igual.',
          ],
          position: 0,
        },
        {
          id: 'step-2',
          sessionId: 'js-variables-basics-01',
          type: 'PREDICT_OUTPUT',
          prompt: '¿Qué valor termina teniendo contador?',
          code: 'let contador = 1;\ncontador = 2;',
          language: 'javascript',
          options: [
            {
              id: 'option-a',
              text: '1',
              correct: false,
            },
            {
              id: 'option-b',
              text: '2',
              correct: true,
            },
            {
              id: 'option-c',
              text: 'undefined',
              correct: false,
            },
          ],
          explanation:
            'let permite reasignar la variable, por eso contador termina valiendo 2.',
          hints: [
            'Mira la última asignación realizada a contador.',
          ],
          position: 1,
        },
        {
          id: 'step-3',
          sessionId: 'js-variables-basics-01',
          type: 'FIND_ERROR',
          prompt: 'Selecciona la línea donde ocurre el error y clasifícalo.',
          code: 'const edad = 25;\nedad = 26;',
          language: 'javascript',
          errorLines: [2],
          errorType: 'assignment-to-constant',
          explanation:
            'Una variable declarada con const no puede recibir una nueva asignación.',
          hints: [
            'Comprueba cómo fue declarada edad antes de intentar cambiarla.',
          ],
          position: 2,
        },
      ],
    });

    console.log('OK: piloto JavaScript / Fundamentos / Variables creado');
  } finally {
    await prisma.$disconnect();
  }
}

void main();
