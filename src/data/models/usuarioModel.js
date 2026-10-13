export class UsuarioModel {
  constructor({ id, usuario, correo, nombre_completo, rol, es_activo }) {
    this.id = id
    this.usuario = usuario
    this.correo = correo
    this.nombreCompleto = nombre_completo
    this.rol = rol // 'admin' o 'usuario'
    this.esActivo = es_activo
  }

  static fromDatabase(record) {
    if (!record) return null
    return new UsuarioModel({
      id: record.id,
      usuario: record.usuario,
      correo: record.correo,
      nombre_completo: record.nombre_completo,
      rol: record.cat_rol?.nombre || 'usuario',
      es_activo: record.es_activo,
    })
  }
}