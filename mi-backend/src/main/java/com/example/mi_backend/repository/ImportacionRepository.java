package com.example.mi_backend.repository;

import com.example.mi_backend.model.Importacion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ImportacionRepository extends JpaRepository<Importacion, Long> {
}