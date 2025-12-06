package com.kbn_backend.kbn_backend.config;

import com.backend.rcv.model.Ubicacion;
import com.backend.rcv.repository.UbicacionRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;

@Configuration
public class UbicacionConfig {

    @Autowired
    private UbicacionRepository ubicacionRepository;

    @PostConstruct
    public void init() {

        String[] nombresUbicaciones = {"DEM NORTE", "DEM CENTRO", "DEM OESTE","DAPS", "HPA", "HU"};

        for (String nombre : nombresUbicaciones) {
            if (ubicacionRepository.findByNombre(nombre) == null) {
                Ubicacion ubicacion = new Ubicacion();
                ubicacion.setNombre(nombre);
                ubicacionRepository.save(ubicacion);
            }
        }
    }
}
