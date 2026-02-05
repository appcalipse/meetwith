export const createImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', error => reject(error))
    image.setAttribute('crossOrigin', 'anonymous') // needed to avoid cross-origin issues on CodeSandbox
    image.src = url
  })

export function getRadianAngle(degreeValue: number) {
  return (degreeValue * Math.PI) / 180
}

export function rotateSize(width: number, height: number, rotation: number) {
  const rotRad = getRadianAngle(rotation)

  return {
    height:
      Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
    width:
      Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
  }
}

export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: {
    x: number
    y: number
    width: number
    height: number
  },
  flip = { horizontal: false, vertical: false },
  options: {
    format?: 'image/jpeg' | 'image/png' | 'image/webp'
    quality?: number // 0.0 to 1.0, only works with jpeg and webp
  } = {}
) {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    return null
  }

  canvas.width = image.width
  canvas.height = image.height

  ctx.translate(image.width / 2, image.height / 2)
  ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1)
  ctx.translate(-image.width / 2, -image.height / 2)

  ctx.drawImage(image, 0, 0)

  const croppedCanvas = document.createElement('canvas')

  const croppedCtx = croppedCanvas.getContext('2d')

  if (!croppedCtx) {
    return null
  }

  croppedCanvas.width = pixelCrop.width
  croppedCanvas.height = pixelCrop.height

  croppedCtx.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  )

  croppedCtx.globalCompositeOperation = 'destination-in'
  croppedCtx.beginPath()
  croppedCtx.arc(
    pixelCrop.width / 2,
    pixelCrop.height / 2,
    Math.min(pixelCrop.width, pixelCrop.height) / 2, // radius
    0,
    2 * Math.PI
  )
  croppedCtx.closePath()
  croppedCtx.fill()

  return new Promise<string>((resolve, reject) => {
    const { format = 'image/webp', quality = 0.8 } = options
    croppedCanvas.toBlob(
      file => {
        if (!file) {
          reject('Canvas is empty')
        } else {
          resolve(URL.createObjectURL(file))
        }
      },
      format,
      quality
    )
  })
}
export async function getCroppedImgRec(
  imageSrc: string,
  pixelCrop: {
    x: number
    y: number
    width: number
    height: number
  },
  flip = { horizontal: false, vertical: false },
  options: {
    format?: 'image/jpeg' | 'image/png' | 'image/webp'
    quality?: number // 0.0 to 1.0, only works with jpeg and webp
  } = {}
) {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    return null
  }

  canvas.width = image.width
  canvas.height = image.height

  ctx.translate(image.width / 2, image.height / 2)
  ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1)
  ctx.translate(-image.width / 2, -image.height / 2)

  ctx.drawImage(image, 0, 0)

  const croppedCanvas = document.createElement('canvas')
  const croppedCtx = croppedCanvas.getContext('2d')

  if (!croppedCtx) {
    return null
  }

  croppedCanvas.width = pixelCrop.width
  croppedCanvas.height = pixelCrop.height

  croppedCtx.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  )

  // No circular masking - rectangular output

  return new Promise<string>((resolve, reject) => {
    const { format = 'image/png', quality = 1 } = options
    croppedCanvas.toBlob(
      file => {
        if (!file) {
          reject('Canvas is empty')
        } else {
          resolve(URL.createObjectURL(file))
        }
      },
      format,
      quality
    )
  })
}

export function readFile(file: Blob) {
  return new Promise<string | undefined>(resolve => {
    const reader = new FileReader()
    reader.addEventListener(
      'load',
      async () =>
        resolve(
          typeof reader.result == 'string'
            ? reader.result
            : reader.result
              ? await arrayBufferToDataUrl(reader.result)
              : undefined
        ),
      false
    )
    reader.readAsDataURL(file)
  })
}

export function arrayBufferToDataUrl(
  buffer: ArrayBuffer,
  mimeType = 'image/png'
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const blob = new Blob([buffer], { type: mimeType })
    const reader = new FileReader()
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Failed to convert ArrayBuffer to data URL'))
      }
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
